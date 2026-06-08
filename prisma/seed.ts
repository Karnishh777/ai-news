/**
 * Production seed for the Postgres data layer.
 *
 * Run with: npm run db:seed  (after `npx prisma migrate dev`)
 *
 * Seeds demo + admin users and the current article pool from the active
 * news provider (mock by default, NewsAPI/RSS when configured).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { MockNewsProvider } from "../src/lib/news/provider";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding NewsFlow AI…");

  const demoHash = await bcrypt.hash("Demo1234", 11);
  const adminHash = await bcrypt.hash("Admin1234", 11);

  await prisma.user.upsert({
    where: { email: "demo@newsflow.ai" },
    update: {},
    create: {
      fullName: "Demo User",
      email: "demo@newsflow.ai",
      passwordHash: demoHash,
      emailVerified: true,
      onboarded: true,
      interests: ["technology", "ai", "science", "business", "space"],
      language: "en",
      newsLength: "short",
      notification: "both",
      location: "San Francisco",
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@newsflow.ai" },
    update: {},
    create: {
      fullName: "Platform Admin",
      email: "admin@newsflow.ai",
      passwordHash: adminHash,
      role: "admin",
      emailVerified: true,
      onboarded: true,
      interests: ["world", "politics", "finance", "technology"],
      language: "en",
      newsLength: "detailed",
      notification: "both",
    },
  });

  // Seed articles + sources from the provider.
  const articles = await new MockNewsProvider().fetchArticles();
  for (const a of articles) {
    const source = await prisma.source.upsert({
      where: { name: a.source.name },
      update: { credibility: a.source.credibility },
      create: { name: a.source.name, credibility: a.source.credibility },
    });
    await prisma.article.upsert({
      where: { slug: a.slug },
      update: {},
      create: {
        title: a.title,
        slug: a.slug,
        category: a.category,
        sourceId: source.id,
        author: a.author,
        imageUrl: a.imageUrl,
        url: a.url,
        summary: a.summary,
        content: a.content,
        takeaways: a.takeaways,
        quickRead: a.quickRead,
        factCheck: a.factCheck,
        readingTimeMin: a.readingTimeMin,
        tags: a.tags,
        trendingScore: a.trendingScore,
        breaking: a.breaking,
        language: a.language,
        publishedAt: new Date(a.publishedAt),
      },
    });
  }

  console.log(`✅ Seeded ${articles.length} articles, 2 users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
