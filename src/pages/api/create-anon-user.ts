import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/server/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { deviceId } = req.body || {};
    if (!deviceId || typeof deviceId !== "string") {
      return res.status(400).json({ error: "deviceId is required" });
    }

    const admin = supabaseAdmin();
    const email = `${deviceId}@anon.local`;
    const password = `Anon_${deviceId}_Secret!99`;

    let uid: string | null = null;
    const { data: profile } = await admin
      .from("profiles")
      .select("uid")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (profile?.uid) {
      uid = profile.uid;
    }

    if (!uid) {
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (newUser?.user?.id) {
        uid = newUser.user.id;
      } else if (createError) {
        const { data: listData } = await admin.auth.admin.listUsers();
        const existingUser = listData?.users?.find((u) => u.email === email);
        if (existingUser) {
          uid = existingUser.id;
          await admin.auth.admin.updateUserById(uid, { password });
        } else {
          throw createError;
        }
      }
    }

    if (!uid) {
      return res.status(500).json({ error: "Failed to create or retrieve anonymous user" });
    }

    await admin.from("profiles").upsert({ device_id: deviceId, uid });

    const { data: signInData, error: signInError } = await admin.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.session?.access_token) {
      throw signInError || new Error("Failed to sign in anonymous user");
    }

    return res.status(200).json({ access_token: signInData.session.access_token });
  } catch (error: any) {
    console.error("create-anon-user error:", error);
    return res.status(500).json({ error: error?.message || "Internal server error" });
  }
}
