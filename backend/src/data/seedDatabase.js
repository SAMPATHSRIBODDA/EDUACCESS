import { announcements, assignments, collegeActivities, courses, events, guides, messages, users } from "./mockData.js";
import { Announcement } from "../models/Announcement.js";
import { Assignment } from "../models/Assignment.js";
import { CollegeActivity } from "../models/CollegeActivity.js";
import { Course } from "../models/Course.js";
import { Event } from "../models/Event.js";
import { Guide } from "../models/Guide.js";
import { Message } from "../models/Message.js";
import { User } from "../models/User.js";

export const seedDatabase = async () => {
  const [usersCount, guidesCount, coursesCount, eventsCount, announcementsCount, assignmentsCount, messagesCount, collegeActivitiesCount] = await Promise.all([
    User.estimatedDocumentCount(),
    Guide.estimatedDocumentCount(),
    Course.estimatedDocumentCount(),
    Event.estimatedDocumentCount(),
    Announcement.estimatedDocumentCount(),
    Assignment.estimatedDocumentCount(),
    Message.estimatedDocumentCount(),
    CollegeActivity.estimatedDocumentCount(),
  ]);

  if (usersCount === 0) {
    await User.insertMany(users);
    console.log(`Seeded users: ${users.length}`);
  }

  if (guidesCount === 0) {
    await Guide.insertMany(guides);
    console.log(`Seeded guides: ${guides.length}`);
  }

  if (coursesCount === 0) {
    await Course.insertMany(courses);
    console.log(`Seeded courses: ${courses.length}`);
  }

  if (eventsCount === 0) {
    await Event.insertMany(events);
    console.log(`Seeded events: ${events.length}`);
  }

  if (announcementsCount === 0) {
    await Announcement.insertMany(announcements);
    console.log(`Seeded announcements: ${announcements.length}`);
  }

  if (assignmentsCount === 0) {
    await Assignment.insertMany(assignments);
    console.log(`Seeded assignments: ${assignments.length}`);
  }

  if (messagesCount === 0) {
    await Message.insertMany(messages);
    console.log(`Seeded messages: ${messages.length}`);
  }

  if (collegeActivitiesCount === 0) {
    await CollegeActivity.insertMany(collegeActivities);
    console.log(`Seeded college activities: ${collegeActivities.length}`);
  }
};
