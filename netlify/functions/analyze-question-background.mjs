import {
    processAIJob,
    verifyWorkerSignature
  } from "./analyze-question.mjs";
  
  function parseBackgroundBody(event) {
    const raw = event?.isBase64Encoded
      ? Buffer
          .from(
            event.body || "",
            "base64"
          )
          .toString("utf8")
      : event?.body || "";
  
    return JSON.parse(raw);
  }
  
  export const handler =
  async (event) => {
    const method =
      String(
        event?.httpMethod || ""
      ).toUpperCase();
  
    if (method !== "POST") {
      console.warn(
        "BOARDS background worker rejected non-POST request."
      );
      return;
    }
  
    let body;
  
    try {
      body =
        parseBackgroundBody(
          event
        );
    } catch (error) {
      console.warn(
        "BOARDS background worker received invalid JSON.",
        error
      );
      return;
    }
  
    const jobId =
      String(
        body?.jobId || ""
      ).trim();
  
    const signature =
      String(
        body?.signature || ""
      ).trim();
  
    if (
      !verifyWorkerSignature(
        jobId,
        signature
      )
    ) {
      console.warn(
        "BOARDS background worker rejected an invalid signature."
      );
      return;
    }
  
    try {
      await processAIJob(jobId);
    } catch (error) {
      console.error(
        "BOARDS background worker infrastructure error:",
        error
      );
  
      /*
       * Re-lanzamos únicamente errores de infraestructura.
       * Netlify puede reintentar una Background Function fallida.
       * Los errores clínicos/proveedor ya se capturan dentro de
       * processAIJob(), que marca el job como failed y devuelve cuota.
       */
      throw error;
    }
  };
  