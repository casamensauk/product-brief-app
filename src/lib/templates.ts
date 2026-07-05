import type { Question } from "@/lib/schemas"

/**
 * Default questionnaire for new discovery sessions. The ids intentionally
 * match the field names of the original hardcoded form so answers saved
 * before questionnaires became editable still line up.
 */
export const DEFAULT_QUESTIONS: Question[] = [
  {
    id: "aboutCompany",
    label: "Who are you and what does your company do?",
    helpText: "Tell us a bit about your company, your role, and your industry.",
    placeholder:
      "e.g. My name is Jane, and I run a logistics startup that helps local bakeries deliver fresh bread...",
    type: "long_text",
    required: true,
  },
  {
    id: "primaryProblem",
    label: "What is the main problem you want to solve?",
    helpText: "Describe the pain point that led you to start this project.",
    placeholder:
      "e.g. We currently track all deliveries on paper, which leads to lost orders and angry customers...",
    type: "long_text",
    required: true,
  },
  {
    id: "targetUsers",
    label: "Who will use this application?",
    helpText: "Think about every kind of person who will touch the product.",
    placeholder:
      "e.g. Our delivery drivers will use it on their phones, and the bakery managers will use it on their computers...",
    type: "long_text",
    required: true,
  },
  {
    id: "mustHaveFeatures",
    label: "What are the must-have features?",
    helpText: "List what the product absolutely needs at launch, plus any nice-to-haves.",
    placeholder:
      "e.g. We absolutely need a map view for drivers, and a calendar view for managers. It would also be nice to have SMS notifications...",
    type: "long_text",
    required: true,
  },
  {
    id: "designInspiration",
    label: "Do you have any design inspiration or existing assets?",
    helpText: "Links to sites you like, brand guidelines, sketches or wireframes.",
    placeholder:
      "e.g. We love the clean look of Stripe. Here is a link to our logo and some rough sketches on Miro: https://miro.com/...",
    type: "long_text",
    required: false,
  },
  {
    id: "logistics",
    label: "What is your timeline and budget?",
    helpText: "A rough range is fine — this helps scope the first version realistically.",
    placeholder:
      "e.g. We are hoping to launch a beta in 3 months. Our budget is around $25,000...",
    type: "long_text",
    required: false,
  },
]
