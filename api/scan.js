export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ status: "error", message: "Only POST allowed" });
    return;
  }

  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwxOX-fT-apvCvULNl8A3mX1ZdIBFzPL0n9_oPcxrtVBdjPfljSFLNkNFTs7c46lx-JrQ/exec"; // <--- PUT YOUR SCRIPT URL

  try {
    const body = req.body;
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // Sometimes Apps Script returns text/plain, so parse accordingly
    let data;
    try {
      data = await response.json();
    } catch {
      data = JSON.parse(await response.text());
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ status: "error", message: error.toString() });
  }
}
