import { NextResponse } from "next/server";
import { ensureSchema, sql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    await ensureSchema();

    const contentType = req.headers.get("content-type") || "";
    let uploadId = "";
    let title = "";
    let collection = "Full-length tests";
    let source = "";
    let published = false;
    let hasKey = true;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      uploadId = (formData.get("uploadId") as string)?.trim() || "";
      title = (formData.get("title") as string)?.trim() || "";
      collection = (formData.get("collection") as string)?.trim() || "Full-length tests";
      source = (formData.get("source") as string)?.trim() || "";
      published = formData.get("published") === "true";
      hasKey =
        formData.get("hasKey") === "true" ||
        formData.get("hasKey") === "1" ||
        formData.get("hasKey") === "on";

      const file = formData.get("file");
      if (file instanceof File) {
        if (!uploadId) {
          uploadId = `up-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        }
        if (!title) {
          title = file.name.replace(/\.(pdf|json|csv)$/i, "");
        }
        const buf = Buffer.from(await file.arrayBuffer());
        const base64Data = buf.toString("base64");
        await sql()`
          INSERT INTO upload_chunks (id, chunk_index, data)
          VALUES (${uploadId}, 0, ${base64Data})
          ON CONFLICT (id, chunk_index) DO UPDATE SET data = EXCLUDED.data;
        `;
      }
    } else {
      const body = await req.json();
      uploadId = String(body.uploadId || "").trim();
      title = String(body.title || "").trim();
      collection = String(body.collection || "Full-length tests").trim();
      source = String(body.source || "").trim();
      published = Boolean(body.published);
      hasKey = body.hasKey !== false;

      if (body.pdfBase64) {
        if (!uploadId) {
          uploadId = `up-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        }
        await sql()`
          INSERT INTO upload_chunks (id, chunk_index, data)
          VALUES (${uploadId}, 0, ${body.pdfBase64})
          ON CONFLICT (id, chunk_index) DO UPDATE SET data = EXCLUDED.data;
        `;
      }
    }

    if (!uploadId) {
      return NextResponse.json(
        { error: "uploadId or file is required to create an import job." },
        { status: 400 }
      );
    }

    if (!title) {
      title = `Practice Test ${new Date().toLocaleDateString()}`;
    }

    await sql()`
      INSERT INTO test_import_jobs (id, title, collection, source, published, has_key, status, step_data)
      VALUES (${uploadId}, ${title}, ${collection}, ${source}, ${published}, ${hasKey}, 'ready', '{}'::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        collection = EXCLUDED.collection,
        source = EXCLUDED.source,
        published = EXCLUDED.published,
        has_key = EXCLUDED.has_key,
        status = 'ready',
        step_data = '{}'::jsonb,
        updated_at = NOW();
    `;

    return NextResponse.json({
      ok: true,
      jobId: uploadId,
      title,
    });
  } catch (err) {
    console.error("Failed to initialize import job:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create import job." },
      { status: 500 }
    );
  }
}
