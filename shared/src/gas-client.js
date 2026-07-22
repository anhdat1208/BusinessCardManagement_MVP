import { createLogPayload } from "./image-storage.js";

export async function postToGas(gasWebAppUrl, payload) {
  const res = await fetch(gasWebAppUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`GAS response is not JSON: ${text}`);
  }
  if (!res.ok || !data.ok) throw new Error(`GAS error: ${JSON.stringify(data)}`);
  return data;
}

export async function logToGas(gasWebAppUrl, event) {
  try {
    await postToGas(gasWebAppUrl, createLogPayload(event));
  } catch (err) {
    console.warn("Could not write processing log:", err?.message || err);
  }
}
