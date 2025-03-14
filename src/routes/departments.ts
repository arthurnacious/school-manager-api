import { Hono } from "hono";
import { JwtVariables } from "hono/jwt";
import db from "@/db";
import { and, eq, sql } from "drizzle-orm";
import { coursesTable, departmentsTable, userToDepartment } from "@/db/schema";
import { departmentUserRole } from "@/types/roles";
import { slugify } from "@/utils";
import { z } from "zod";

const createDepartmentSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),
});

const deleteDepartmentsSchema = z.object({
  ids: z.array(z.string()),
});

const assignUserToDepartmentSchema = z.object({
  userId: z.string().min(1, {
    message: "User Must be selected",
  }),
  departmentId: z.string().min(1, {
    message: "Department Must be selected",
  }),
  role: z.nativeEnum(departmentUserRole).default(departmentUserRole.LECTURER),
});

const unassignUsersToDeprtmentSchema = z.object({
  idObject: z.array(z.object({ userId: z.string(), departmentId: z.string() })),
});

const departments = new Hono<{ Variables: JwtVariables }>();
// departments.use("*", authMiddleware);

departments
  .get("/", async (ctx) => {
    const data = await db
      .select({
        id: departmentsTable.id,
        name: departmentsTable.name,
        slug: departmentsTable.slug,
        createdAt: departmentsTable.createdAt,
        updatedAt: departmentsTable.updatedAt,
        leadersCount: sql<number>`
        (SELECT COUNT(*) 
         FROM ${userToDepartment} 
         WHERE ${userToDepartment.role} = ${departmentUserRole.LEADER} AND ${userToDepartment.departmentId} = ${departmentsTable.id}
        )`.as("leaders_count"),
        lecturersCount: sql<number>`
        (SELECT COUNT(*) 
         FROM ${userToDepartment} 
         WHERE ${userToDepartment.role} = ${departmentUserRole.LECTURER} AND ${userToDepartment.departmentId} = ${departmentsTable.id}
        )`.as("lecturers_count"),
        coursesCount: sql`count(distinct ${coursesTable.id})`.as(
          "courses_count"
        ),
      })
      .from(departmentsTable)
      .leftJoin(
        coursesTable,
        eq(departmentsTable.id, coursesTable.departmentId)
      )
      .leftJoin(
        userToDepartment,
        eq(departmentsTable.id, userToDepartment.departmentId)
      )
      .groupBy(departmentsTable.id)
      .execute();

    return ctx.json({ data });
  })
  .patch("/", async (ctx) => {
    try {
      const body = await ctx.req.json(); // Get request body
      const validatedData = deleteDepartmentsSchema.safeParse(body); // Validate input
      console.log(validatedData.data);
      if (!validatedData.success) {
        return ctx.json({ error: validatedData.error.format() }, 400);
      }

      const { ids } = validatedData.data;

      const data = await Promise.all(
        ids.map((departmentId) =>
          db
            .delete(departmentsTable)
            .where(eq(departmentsTable.id, departmentId))
        )
      );

      return ctx.json({ data }, 200);
    } catch (error) {
      console.error("Error deleting departments:", error);
      return ctx.json({ error: "Internal Server Error" }, 500);
    }
  })
  .post("/", async (ctx) => {
    try {
      const body = await ctx.req.json(); // Get request body
      const validatedData = createDepartmentSchema.safeParse(body); // Validate input

      if (!validatedData.success) {
        return ctx.json({ error: validatedData.error.format() }, 400);
      }

      const { name } = validatedData.data;

      var slug = slugify(name);

      let baseSlug = slug;
      let counter = 1;
      while (
        await db.query.departmentsTable.findFirst({
          where: (department, { eq }) => eq(department.slug, slug),
        })
      ) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const data = await db.insert(departmentsTable).values({
        name: capitalizeFirstLetter(name),
        slug: slugify(name),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return ctx.json({ data }, 201);
    } catch (error) {
      console.error("Error creating department:", error);
      return ctx.json({ error: "Internal Server Error" }, 500);
    }
  })
  .get("/:slug", async (ctx) => {
    const { slug } = ctx.req.param();

    const data = await db.query.departmentsTable.findFirst({
      where: (department, { eq }) => eq(department.slug, slug),
      with: {
        members: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        courses: {
          columns: {
            id: true,
            name: true,
            slug: true,
            createdAt: true,
          },
        },
      },
    });

    return ctx.json({ data });
  })
  .put("/:slug", async (ctx) => {
    const { slug } = ctx.req.param();
    try {
      const body = await ctx.req.json(); // Get request body
      const validatedData = createDepartmentSchema.safeParse(body); // Validate input

      if (!validatedData.success) {
        return ctx.json({ error: validatedData.error.format() }, 400);
      }

      const { name } = validatedData.data;

      const data = await db
        .update(departmentsTable)
        .set({
          name: capitalizeFirstLetter(name),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(departmentsTable.slug, slug))
        .execute();

      return ctx.json({ data }, 200);
    } catch (error) {
      console.error("Error updating department:", error);
      return ctx.json({ error: "Internal Server Error" }, 500);
    }
  })
  .post("/members", async (ctx) => {
    try {
      const body = await ctx.req.json(); // Get request body
      const validatedData = assignUserToDepartmentSchema.safeParse(body); // Validate input

      if (!validatedData.success) {
        return ctx.json({ error: validatedData.error.format() }, 400);
      }

      const { userId, departmentId, role } = validatedData.data;

      const data = await db.insert(userToDepartment).values({
        userId,
        departmentId,
        role,
      });

      return ctx.json({ data }, 200);
    } catch (error) {
      console.error("Error attaching user to department:", error);
      return ctx.json({ error: "Internal Server Error" }, 500);
    }
  })
  .patch("/members", async (ctx) => {
    try {
      const body = await ctx.req.json();
      const validatedData = unassignUsersToDeprtmentSchema.safeParse(body); // Validate input

      if (!validatedData.success) {
        return ctx.json({ error: validatedData.error.format() }, 400);
      }

      const { idObject } = validatedData.data;

      console.log("idObject", idObject);

      const data = await Promise.all(
        idObject.map(({ userId, departmentId }) =>
          db
            .delete(userToDepartment)
            .where(
              and(
                eq(userToDepartment.userId, userId),
                eq(userToDepartment.departmentId, departmentId)
              )
            )
        )
      );

      return ctx.json({ data }, 200);
    } catch (error) {
      console.error("Error attaching user to department:", error);
      return ctx.json({ error: "Internal Server Error" }, 500);
    }
  });

export default departments;

function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
