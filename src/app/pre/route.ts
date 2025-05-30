import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "@/env";
import { db } from "@/server/db";

// 定义请求数据的验证模式
const annotationSchema = z.object({
  imageUrl: z.string().min(1, "请输入有效的图像URL"),
  annotationText: z.string().min(1, "标注文本不能为空"),
  note: z.string().optional(),
  code: z.string().min(1, "密码不能为空"),
});

export async function POST(request: Request) {
  try {
    // 解析请求体
    const body = (await request.json()) as z.infer<typeof annotationSchema>;

    // 验证请求数据
    const validatedData = annotationSchema.parse(body);
    if (validatedData.code !== env.INVITE_CODE) {
      return NextResponse.json(
        {
          success: false,
          message: "密码错误",
        },
        { status: 401 },
      );
    }

    const image = await db.image.findFirst({
      where: {
        path: validatedData.imageUrl,
      },
    });

    if (!image) {
      return NextResponse.json(
        {
          success: false,
          message: "图片不存在",
        },
        { status: 404 },
      );
    }

    await db.annotation.create({  data: {
        type: 'OCR',
        text: validatedData.annotationText,
        status: 'PENDING',
        imageId: image.id,
        createdById: undefined,
        note: validatedData.note ?? undefined,
      } });

    return NextResponse.json(
      {
        success: true,
        message: "标注数据已接收",
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "数据验证失败",
          errors: error.errors,
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        success: false,
        message: "服务器内部错误",
      },
      { status: 500 },
    );
  }
}
