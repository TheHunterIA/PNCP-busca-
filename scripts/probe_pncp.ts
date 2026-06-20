async function probe(url: string) {
  console.log(`Probe: ${url}`);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });
    console.log(`  Status: ${res.status}`);
    if (res.ok) {
       const data = await res.json();
       console.log(`  Success! Records: ${data.data?.length || '?'}`);
    } else {
       const text = await res.text();
       console.log(`  Error: ${text.substring(0, 100)}`);
    }
  } catch (e) {
    console.log(`  Fail: ${e}`);
  }
}

async function main() {
  const d = "20250101";
  const de = "20250110";
  // Usando o path mapeado no Swagger
  await probe(`https://pncp.gov.br/pncp-consulta/v1/contratacoes/publicacao?dataInicial=${d}&dataFinal=${de}&codigoModalidadeContratacao=4&pagina=1`);
  // Testando com /api na frente caso o Nginx faca o rewrite
  await probe(`https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?dataInicial=${d}&dataFinal=${de}&codigoModalidadeContratacao=4&pagina=1`);
}

main();
