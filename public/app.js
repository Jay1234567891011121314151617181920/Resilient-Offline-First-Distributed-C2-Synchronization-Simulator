const nodesEl = document.querySelector("#nodes");
const recordsEl = document.querySelector("#records");
const eventsEl = document.querySelector("#events");
const clockEl = document.querySelector("#clock");

async function api(path, body) {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Request failed");
  return result.state ?? result;
}

const safe = (value) => {
  const el = document.createElement("span");
  el.textContent = String(value);
  return el.innerHTML;
};

function render(state) {
  clockEl.textContent = new Date(state.clock).toLocaleString();
  nodesEl.innerHTML = state.nodes.map((node) => `
    <article class="node ${node.connected ? "" : "offline"}">
      <div class="node-top">
        <div><h3>${safe(node.name)}</h3><small>${safe(node.generation)} · ${safe(node.clearance)}</small></div>
        <span class="status">${node.connected ? "CONNECTED" : "OFFLINE"}</span>
      </div>
      <div class="metrics">
        <div class="metric"><strong>${node.queuedMessages}</strong><span>QUEUED</span></div>
        <div class="metric"><strong>${node.dataAgeMinutes}m</strong><span>DATA AGE</span></div>
        <div class="metric"><strong>${node.syncStats.conflicts}</strong><span>CONFLICTS</span></div>
      </div>
      <div class="node-actions">
        <button data-action="disconnect" data-node="${safe(node.id)}" ${node.connected ? "" : "disabled"}>Disconnect</button>
        <button data-action="report" data-node="${safe(node.id)}">Add report</button>
        <button data-action="reconnect" data-node="${safe(node.id)}" ${node.connected ? "disabled" : ""}>Reconnect</button>
      </div>
    </article>`).join("");

  recordsEl.innerHTML = state.canonicalRecords.map((record) => `
    <tr><td>${safe(record.recordId)}</td><td>${safe(record.type)}</td><td>${safe(record.sourceId)}</td><td>v${record.version}</td><td>${safe(record.classification)}</td></tr>
  `).join("");

  eventsEl.innerHTML = state.eventLog.length ? state.eventLog.map((event) => `
    <div class="event ${safe(event.kind)}">
      <time>${new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
      <span class="kind">${safe(event.kind)}</span>
      <p>${safe(event.message)}</p>
    </div>`).join("") : '<p class="empty">No events yet.</p>';
}

async function refresh() { render(await api("/api/state")); }

document.querySelector("#demo").addEventListener("click", async () => render(await api("/api/demo", {})));
document.querySelector("#advance").addEventListener("click", async () => render(await api("/api/advance", { minutes: 5 })));
document.querySelector("#reset").addEventListener("click", async () => render(await api("/api/reset", {})));
document.querySelector("#integration-demo").addEventListener("click", async () => {
  const output = document.querySelector("#integration-results");
  const result = await api("/api/integration/demo", {});
  output.innerHTML = result.results.map(({ message, assessment }) => `
    <article class="assessment ${safe(assessment.decision)}">
      <strong>${safe(assessment.decision)}</strong>
      <span>${safe(message.source.systemType)} · ${safe(message.recordId)}</span>
      <p>${safe(assessment.explanation)}</p>
    </article>`).join("");
});

nodesEl.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const { action, node } = button.dataset;
  if (action === "report") {
    const body = {
      type: "situation_report",
      payload: { status: "locally-observed", note: "Synthetic training event" },
      classification: "RESTRICTED"
    };
    render(await api(`/api/nodes/${node}/report`, body));
  } else {
    render(await api(`/api/nodes/${node}/${action}`, {}));
  }
});

refresh().catch((error) => { eventsEl.innerHTML = `<p class="empty">${safe(error.message)}</p>`; });
