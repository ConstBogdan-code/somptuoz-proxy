export default async function handler(req, res) {
  // CORS — permite cereri de pe smtz.ro
  res.setHeader("Access-Control-Allow-Origin", "https://smtz.ro");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { image, mimeType } = req.body;

  if (!image || !mimeType) {
    return res.status(400).json({ error: "Lipsesc câmpurile image sau mimeType" });
  }

  const CATALOG_DESC = `
1. cearceaf-finejersey | Cearceaf cu elastic FineJersey | Dormitor | Alb, Wollweiss, Natur, Schlamm, Hellrosa, Lavendel, Petrol, Rubin, Silber, Terra
2. husa-pilota-bio | Husă pilotă Organic BIO COTTON | Dormitor Bumbac organic | Graphit, Alb, Stein, Sand
3. husa-pilota-bumbac | Husă pilotă Bumbac | Dormitor | Taback, Alb, SeaBlue, Weinrot
4. husa-pilota-pro | Husă pilotă Profesional | Dormitor HoReCa | Graphit, Alb, Stein, Sand
5. cuvertura-myknos | Cuvertură Myknos 100% Bumbac | Dormitor | Cappuccino, Dunkelblau, Hellblau, Metal, Offwhite, Apfelgruen, Petrol, Rose, Sage, Stone, Terra, Anthrazit
6. patura-pique | Pătură de Vară Piqué 100% Bumbac | Dormitor | Marine, Pumpkin, Stein, Tinte, Titan, Alb, Yellow
7. halat-waffle | Halat Baie Waffle Piqué GOTS | Baie | Alb, Anthrazit
8. prosop-solid | Prosop Solid 501 | Baie | Alb, Titanium, Perlmut, Sand, Stone, Taupe
9. prosop-soft | Prosop Soft Feel 601 | Baie | Alb, Petrol, Anthrazit, Gelb, Kiwi, Navy, Rose, Royal, Silber, Tanne, Titan, Beere
10. pilota-4 | Pilotă 4 Anotimpuri | Dormitor | Alb`;

  const systemPrompt = `Ești stilistul brandului Somptuoz (smtz.ro), textile premium din bumbac pur. Analizează fotografia dormitorului și returnează STRICT DOAR un obiect JSON valid, fără niciun text înainte sau după.

CATALOG (format: id | nume | categorie | culori disponibile):
${CATALOG_DESC}

Format JSON obligatoriu:
{"analiza":"2-3 propoziții despre stilul și culorile dormitorului la persoana a doua","recomandari":[{"id":"id-din-catalog","emoji":"emoji","produs":"Numele produsului","categorie":"categoria","culori_recomandate":["culori potrivite din lista"],"motivatie":"de ce se potriveste acestui dormitor"}]}

Returnează 3-5 recomandări. DOAR JSON, nimic altceva.`;

  try {
    const anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType, data: image } },
            { type: "text", text: "Analizează dormitorul și recomandă produse Somptuoz." }
          ]
        }]
      })
    });

    const anthropicData = await anthropicResp.json();

    if (!anthropicResp.ok) {
      return res.status(anthropicResp.status).json({ error: anthropicData.error?.message || "Eroare API" });
    }

    const raw = anthropicData.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: "Răspuns invalid de la AI" });

    const parsed = JSON.parse(match[0]);
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
