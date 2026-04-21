module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { image, mimeType } = req.body || {};
  if (!image || !mimeType) return res.status(400).json({ error: "Lipsesc campurile image sau mimeType" });

  const CATALOG = `
1. cearceaf-finejersey | Cearceaf cu elastic FineJersey | Dormitor | Alb, Wollweiss, Natur, Schlamm, Hellrosa, Lavendel, Petrol, Rubin, Silber, Terra
2. husa-pilota-bio | Husa pilota Organic BIO COTTON | Dormitor Bumbac organic | Graphit, Alb, Stein, Sand
3. husa-pilota-bumbac | Husa pilota Bumbac | Dormitor | Taback, Alb, SeaBlue, Weinrot
4. husa-pilota-pro | Husa pilota Profesional | Dormitor HoReCa | Graphit, Alb, Stein, Sand
5. cuvertura-myknos | Cuvertura Myknos 100% Bumbac | Dormitor | Cappuccino, Dunkelblau, Hellblau, Metal, Offwhite, Apfelgruen, Petrol, Rose, Sage, Stone, Terra, Anthrazit
6. patura-pique | Patura de Vara Pique 100% Bumbac | Dormitor | Marine, Pumpkin, Stein, Tinte, Titan, Alb, Yellow
7. halat-waffle | Halat Baie Waffle Pique GOTS | Baie | Alb, Anthrazit
8. prosop-solid | Prosop Solid 501 | Baie | Alb, Titanium, Perlmut, Sand, Stone, Taupe
9. prosop-soft | Prosop Soft Feel 601 | Baie | Alb, Petrol, Anthrazit, Gelb, Kiwi, Navy, Rose, Royal, Silber, Tanne, Titan, Beere
10. pilota-4 | Pilota 4 Anotimpuri | Dormitor | Alb`;

  const systemPrompt = `Esti stilistul brandului Somptuoz (smtz.ro), textile premium din bumbac pur. Analizeaza fotografia dormitorului si returneaza STRICT DOAR un obiect JSON valid, fara niciun text inainte sau dupa.

CATALOG (format: id | nume | categorie | culori disponibile):
${CATALOG}

Format JSON obligatoriu:
{"analiza":"2-3 propozitii despre stilul si culorile dormitorului la persoana a doua","recomandari":[{"id":"id-din-catalog","emoji":"emoji","produs":"Numele produsului","categorie":"categoria","culori_recomandate":["culori potrivite"],"motivatie":"de ce se potriveste"}]}

Returneaza 3-5 recomandari. DOAR JSON, nimic altceva.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
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
            { type: "text", text: "Analizeaza dormitorul si recomanda produse Somptuoz." }
          ]
        }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || "Eroare API" });

    const raw = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: "Raspuns invalid AI: " + raw.substring(0, 100) });

    return res.status(200).json(JSON.parse(match[0]));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
