
async function loadLedger(){
  const table = document.getElementById('ledger-table');
  const thead = document.getElementById('ledger-head');
  const tbody = document.getElementById('ledger-body');
  try{
    const res = await fetch('./data/ledger.csv');
    const text = await res.text();
    const rows = text.trim().split('\n').map(r=>r.split(','));
    const headers = rows.shift();
    thead.innerHTML = '<tr>' + headers.map(h=>`<th>${h}</th>`).join('') + '</tr>';
    tbody.innerHTML = rows.map(r=>'<tr>'+r.map(c=>`<td>${c}</td>`).join('')+'</tr>').join('');
    table.style.display='table';
  }catch(e){
    document.getElementById('ledger-fallback').style.display='block';
  }
}
document.addEventListener('DOMContentLoaded', loadLedger);
