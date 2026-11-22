const API = 'http://localhost:3000/api';

const vorm = document.getElementById('nota-vorm');
const titelVeld = document.getElementById('titel');
const inhoudVeld = document.getElementById('inhoud');
const lys = document.getElementById('nota-lys');

async function laaiNotas() {
  const res = await fetch(`${API}/notes`);
  const notas = await res.json();
  lys.innerHTML = '';
  for (const nota of notas) {
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${nota.title}</strong>
      <div>${nota.body ?? ''}</div>
      <small>${new Date(nota.created_at).toLocaleString('af-ZA')}</small>
    `;
    lys.appendChild(li);
  }
}

vorm.addEventListener('submit', async (e) => {
  e.preventDefault();
  await fetch(`${API}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: titelVeld.value, body: inhoudVeld.value }),
  });
  titelVeld.value = '';
  inhoudVeld.value = '';
  laaiNotas();
});

laaiNotas();
