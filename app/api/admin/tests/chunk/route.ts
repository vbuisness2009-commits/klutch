import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

async function ensureChunkTable() {
  await sql()`
    CREATE TABLE IF NOT EXISTS upload_chunks (
      id TEXT,
      chunk_index INT,
      data TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (id, chunk_index)
    );
  `;
  // Clean up any stale chunks older than 2 hours
  await sql()`
    DELETE FROM upload_chunks WHERE created_at < NOW() - INTERVAL '2 hours';
  `.catch(() => {});
}

export async function POST(req: Request) {
  try {
    await ensureChunkTable();

    const contentType = req.headers.get("content-type") || "";
    let uploadId = "";
    let chunkIndex = 0;
    let totalChunks = 1;
    let base64Data = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      uploadId = String(formData.get("uploadId") || "").trim();
      chunkIndex = Number(formData.get("chunkIndex") || 0);
      totalChunks = Number(formData.get("totalChunks") || 1);
      const chunkFile = formData.get("chunk");
      if (chunkFile instanceof Blob) {
        const arrayBuf = await chunkFile.arrayBuffer();
        base64Data = Buffer.from(arrayBuf).toString("base64");
      }
    } else {
      const json = await req.json();
      uploadId = String(json.uploadId || "").trim();
      chunkIndex = Number(json.chunkIndex || 0);
      totalChunks = Number(json.totalChunks || 1);
      base64Data = String(json.chunk || "");
    }

    if (!uploadId || !base64Data) {
      return NextResponse.json(
        { error: "Invalid chunk payload." },
        { status: 400 }
      );
    }

    await sql()`
      INSERT INTO upload_chunks (id, chunk_index, data)
      VALUES (${uploadId}, ${chunkIndex}, ${base64Data})
      ON CONFLICT (id, chunk_index) DO UPDATE SET data = EXCLUDED.data;
    `;

    return NextResponse.json({
      ok: true,
      uploadId,
      chunkIndex,
      totalChunks,
    });
  } catch (err) {
    console.error("Chunk upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Chunk upload failed." },
      { status: 500 }
    );
  }
}
