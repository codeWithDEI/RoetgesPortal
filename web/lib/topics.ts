import councilData from "../public/data/views/council/items.json";
import topicData from "../public/data/datasets/topics.json";

export type TopicStatus =
  | "idea"
  | "announced"
  | "consultation"
  | "committee"
  | "council"
  | "decided"
  | "implementation"
  | "completed"
  | "paused"
  | "rejected";

export type TopicDates = {
  createdAt: string;
  updatedAt: string;
  lastVerifiedAt: string;
};

export type Milestone = {
  date: string;
  title: string;
  description?: string;
  status: "planned" | "reached" | "postponed" | "cancelled";
};

export type TopicSource = {
  title: string;
  sourceType:
    | "agenda"
    | "proposal"
    | "minutes"
    | "resolution"
    | "budget"
    | "planningDocument"
    | "pressRelease"
    | "website"
    | "other";
  url: string;
  publishedAt?: string;
  accessedAt: string;
};

export type Topic = {
  id: string;
  title: string;
  summary: string;
  description?: string;
  status: TopicStatus;
  visibility: "draft" | "published" | "archived";
  categories: string[];
  organizations: string[];
  dates: TopicDates;
  milestones: Milestone[];
  sources: TopicSource[];
};

export type TopicListItem = Pick<
  Topic,
  | "id"
  | "title"
  | "summary"
  | "status"
  | "categories"
  | "organizations"
  | "dates"
> & {
  detail: string;
  upcomingMilestone?: Milestone;
};

type CouncilData = {
  items: TopicListItem[];
  facets: {
    status: TopicStatus[];
    categories: string[];
  };
};

type TopicDataset = {
  items: Topic[];
};

export const councilTopics = (councilData as CouncilData).items;
export const topicFacets = (councilData as CouncilData).facets;
export const topics = (topicData as TopicDataset).items;

export function getTopic(id: string): Topic | undefined {
  return topics.find((topic) => topic.id === id);
}

export const latestVerificationDate = topics.reduce(
  (latest, topic) =>
    topic.dates.lastVerifiedAt > latest
      ? topic.dates.lastVerifiedAt
      : latest,
  "",
);
