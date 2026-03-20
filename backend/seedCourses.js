// backend/seedCourses.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { sequelize } from "./config/db.js";
import {
    Course,
    Module,
    Lesson,
    LessonContent,
} from "./models/modelAssociations.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const coursesPath = path.join(__dirname, "../frontend/public/data/courses.json");
const learningPath = path.join(__dirname, "../frontend/public/data/learning.json");

const normalizeImagePath = (image) => {
    if (!image) return null;

    if (image.startsWith("http://") || image.startsWith("https://")) {
        return image;
    }

    if (image.startsWith("/")) {
        return image;
    }

    const fileName = image.split("/").pop();
    return `/uploads/courses/${fileName}`;
};

async function seedCourses() {
    try {
        await sequelize.sync({ force: true });

        console.log("🌱 Seeding courses...");

        const coursesData = JSON.parse(fs.readFileSync(coursesPath, "utf-8"));
        const learningData = JSON.parse(fs.readFileSync(learningPath, "utf-8"));

        const courses = coursesData.popularCourses || [];

        for (const course of courses) {
            const createdCourse = await Course.create({
                id: String(course.id),
                title: course.title || null,
                category: course.category || null,
                categoryColor: course.categoryColor || null,
                lessons: course.lessons || null,
                lessonsCount: course.lessonsCount ?? null,
                level: course.level || null,
                price: course.price || null,
                priceValue: course.priceValue ?? null,
                currency: course.currency || null,
                rating: course.rating ?? null,
                students: course.students || null,
                studentsCount: course.studentsCount ?? null,
                image: normalizeImagePath(course.image),
                isBookmarked: course.isBookmarked ?? false,
            });

            const learning = learningData[String(course.id)];
            if (!learning || !Array.isArray(learning.modules)) continue;

            for (let mIndex = 0; mIndex < learning.modules.length; mIndex++) {
                const module = learning.modules[mIndex];

                const moduleId = `${createdCourse.id}-${module.id || `module-${mIndex + 1}`}`;

                const createdModule = await Module.create({
                    id: moduleId,
                    title: module.title || null,
                    order: mIndex,
                    courseId: createdCourse.id,
                });

                if (!Array.isArray(module.lessons)) continue;

                for (let lIndex = 0; lIndex < module.lessons.length; lIndex++) {
                    const lesson = module.lessons[lIndex];

                    const createdLesson = await Lesson.create({
                        id: String(lesson.id),
                        title: lesson.title || null,
                        duration: lesson.duration || null,
                        completed: lesson.completed ?? false,
                        playing: lesson.playing ?? false,
                        type: lesson.type || null,
                        youtubeUrl: lesson.youtubeUrl || null,
                        order: lIndex,
                        moduleId: createdModule.id,
                    });

                    if (
                        learning.currentLesson &&
                        String(learning.currentLesson.id) === String(lesson.id) &&
                        learning.currentLesson.content
                    ) {
                        await LessonContent.create({
                            lessonId: createdLesson.id,
                            introduction: learning.currentLesson.content.introduction || null,
                            keyConcepts: learning.currentLesson.content.keyConcepts || [],
                        });
                    }
                }
            }
        }

        console.log("✅ Courses seeded successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    }
}

seedCourses();