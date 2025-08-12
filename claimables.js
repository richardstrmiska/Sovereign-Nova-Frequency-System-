
const ACCOUNT = "GDRCCXK6MZ33MXN4BMOJBOTXRUDF5X72VDRJZMLY5RS6TN25KCPWULBY";
const HORIZON = "https://horizon.stellar.org";

function fmtAmount(a) {
  const n = Number(a);
  if (Number.isNaN(n)) return a;
  return n.toLocaleString(undefined, {maximumFractionDigits: 7});
}

function predicateToText(p) {
  if (!p) return "—";
  if (p.unconditional !== undefined) return "unconditional";
  if (p.not) return "NOT(" + predicateToText(p.not) + ")";
  if (p.and) return p.and.map(predicateToText).join(" AND ");
  if (p.or) return p.or.map(predicateToText).join(" OR ");
  if (p.abs_before) return "before " + new Date(p.abs_before).toISOString();
  if (p.rel_before) return "before +" + p.rel_before + "s";
  return JSON.stringify(p);
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

async function loadClaimantsView() {
  const url = `${HORIZON}/claimable_balances?claimant=${ACCOUNT}&limit=200&order=desc`;
  let records = [];
  let json = await fetchJson(url);
  records = records.concat(json._embedded.records);
  // If more pages, follow next links up to a reasonable count
  let count = 0;
  while (json._links && json._links.next && json._links.next.href && count < 10) {
    const nextUrl = json._links.next.href;
    json = await fetchJson(nextUrl);
    if (!json._embedded || !json._embedded.records.length) break;
    records = records.concat(json._embedded.records);
    count++;
  }

  const table = document.getElementById('cb-table');
  const thead = document.getElementById('cb-head');
  const tbody = document.getElementById('cb-body');

  if (!records.length) {
    document.getElementById('cb-empty').style.display = 'block';
  } else {
    const headers = ["Balance ID","Asset","Amount","Sponsor","Created At","Claimants","Predicate"];
    thead.innerHTML = "<tr>"+headers.map(h=>`<th>${h}</th>`).join("")+"</tr>";
    tbody.innerHTML = records.map(r=>{
      const asset = r.asset === "native" ? "XLM" : r.asset;
      const amount = fmtAmount(r.amount);
      const createdAt = r.last_modified_time || "—";
      const claimants = (r.claimants||[]).map(c=>c.destination.slice(0,6)+"…"+c.destination.slice(-4)).join("<br>");
      const pred = (r.claimants&&r.claimants[0]&&r.claimants[0].predicate) ? predicateToText(r.claimants[0].predicate) : "—";
      return `<tr>
        <td><a href="https://stellar.expert/explorer/public/claimable-balance/${r.id}" target="_blank" rel="noopener">${r.id.slice(0,8)}…</a></td>
        <td>${asset}</td>
        <td>${amount}</td>
        <td>${r.sponsor||"—"}</td>
        <td>${createdAt}</td>
        <td>${claimants}</td>
        <td>${pred}</td>
      </tr>`;
    }).join("");
    table.style.display = 'table';
  }
  return records;
}

async function loadCreatedByMe() {
  const url = `${HORIZON}/accounts/${ACCOUNT}/operations?join=transactions&limit=200&order=desc&include_failed=false`;
  let records = [];
  let json = await fetchJson(url);
  records = records.concat(json._embedded.records.filter(r=>r.type === "create_claimable_balance"));
  // Follow pages (limited)
  let count = 0;
  while (json._links && json._links.next && json._links.next.href && count < 10) {
    const nextUrl = json._links.next.href;
    json = await fetchJson(nextUrl);
    const batch = (json._embedded.records||[]).filter(r=>r.type === "create_claimable_balance");
    if (!batch.length) break;
    records = records.concat(batch);
    count++;
  }

  const table = document.getElementById('ops-table');
  const thead = document.getElementById('ops-head');
  const tbody = document.getElementById('ops-body');

  if (!records.length) {
    document.getElementById('ops-empty').style.display = 'block';
  } else {
    const headers = ["When","Asset","Amount","Claimants","Predicate","Tx Hash"];
    thead.innerHTML = "<tr>"+headers.map(h=>`<th>${h}</th>`).join("")+"</tr>";
    tbody.innerHTML = records.map(r=>{
      const asset = r.asset === "native" ? "XLM" : r.asset;
      const claimants = (r.claimants||[]).map(c=>c.destination.slice(0,6)+"…"+c.destination.slice(-4)).join("<br>");
      const pred = (r.claimants&&r.claimants[0]&&r.claimants[0].predicate) ? predicateToText(r.claimants[0].predicate) : "—";
      const when = r.created_at || (r.transaction? r.transaction.created_at : "—");
      const tx = r.transaction_hash || (r.transaction? r.transaction.hash : "—");
      return `<tr>
        <td>${when}</td>
        <td>${asset}</td>
        <td>${fmtAmount(r.amount)} </td>
        <td>${claimants}</td>
        <td>${pred}</td>
        <td><a href="https://stellar.expert/explorer/public/tx/${tx}" target="_blank" rel="noopener">${tx.slice(0,8)}…</a></td>
      </tr>`;
    }).join("");
    table.style.display = 'table';
  }
  return records;
}

function toCsv(rows) {
  const escape = (v)=>(''+v).replaceAll('"','""');
  return rows.map(r=>r.map(c=>`"${escape(c)}"`).join(",")).join("\n");
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const cb = await loadClaimantsView();
    const ops = await loadCreatedByMe();
    const stats = document.getElementById('stats');
    stats.textContent = `Active (claimant): ${cb.length} • Created by me: ${ops.length}  (paged)`;

    // Enable CSV export (combine both sets)
    const allRows = [["Type","When/Created","Asset","Amount","Claimants","Predicate","Link"]];
    cb.forEach(r=>{
      const asset = r.asset === "native" ? "XLM" : r.asset;
      const pred = (r.claimants&&r.claimants[0]&&r.claimants[0].predicate) ? predicateToText(r.claimants[0].predicate) : "—";
      allRows.push(["claimable_balance", r.last_modified_time||"—", asset, r.amount, (r.claimants||[]).map(c=>c.destination).join("; "), pred, `https://stellar.expert/explorer/public/claimable-balance/${r.id}`]);
    });
    ops.forEach(r=>{
      const asset = r.asset === "native" ? "XLM" : r.asset;
      const when = r.created_at || (r.transaction? r.transaction.created_at : "—");
      const pred = (r.claimants&&r.claimants[0]&&r.claimants[0].predicate) ? predicateToText(r.claimants[0].predicate) : "—";
      allRows.push(["created_by_me", when, asset, r.amount, (r.claimants||[]).map(c=>c.destination).join("; "), pred, `https://stellar.expert/explorer/public/tx/${r.transaction_hash|| (r.transaction? r.transaction.hash : '')}`]);
    });

    const btn = document.getElementById('exportCsvBtn');
    const link = document.getElementById('exportLink');
    btn.addEventListener('click', ()=>{
      const csv = toCsv(allRows);
      const blob = new Blob([csv], {type: 'text/csv'});
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = 'claimable_balances_export.csv';
      link.style.display = 'inline-block';
      link.textContent = 'Download CSV';
    });
  } catch (e) {
    document.getElementById('notice').style.display='block';
    document.getElementById('notice').textContent = "Failed to load Horizon data: " + e.message;
  }
});
