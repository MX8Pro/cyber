import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";

export async function parseJson<T>(request: Request, schema: ZodSchema<T>) {
  const body = await request.json();
  return schema.parse(body);
}

export function jsonOk(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init?.headers ?? {})
    }
  });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
