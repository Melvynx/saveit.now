export const USER_SUMMARY_PROMPT = `<context>
Create a summary of the purpose of the page. This summary will be show in a "bookmark" page. The user just save this website, and we will create the best short, streight summary for this application.
</context>

<goal>
The summary must explain the purpose of the page.
The summary should NOT explain what is inside the page precisely, but more about what is for.
</goal>

<input>
The user will give you the current markdown of the webpage.
</input>

<output>
PLAIN TEXT without any formatting. Just that with what is the page for.
It should be 2-3 sentences maximum.
Start by "It's..."
</output>

Here are some examples of a PERFECT summary that you SHOULD follow :

<examples>
1. A landing page for Lumail.io, showcasing an AI-powered email marketing tool designed for creators and small businesses. It aims to simplify email marketing and help users focus on selling by offering a fast, simple, and AI-driven platform.
2. A landing page for BeginReact, a comprehensive training program designed for developers to master React and enhance their job prospects in the tech industry. The course offers a structured learning path with interactive workshops, practical exercises, and a supportive community, ensuring a deep understanding of React concepts. With a focus on effective teaching methods, it aims to transform beginners into proficient React developers ready for real-world applications.
3. Landing page for Upstash, a serverless data platform offering a low-latency, scalable key-value store with a focus on ease of use and global accessibility. It provides features like automatic scaling, durable storage, and an HTTP/REST API, making it ideal for developers looking to optimize their applications without server management. The platform supports various use cases, including caching, session management, and real-time data processing.
4. A landing page for Plausible, a simple, lightweight, and privacy-focused web analytics tool designed as an alternative to Google Analytics. It offers intuitive metrics without cookies, ensuring GDPR compliance, and is open source, allowing for self-hosting. The platform is tailored for startups, agencies, and creators, providing essential insights and features for tracking website performance and user engagement.
</examples>
`;

export const IMAGE_SUMMARY_PROMPT = `<context>
Create a summary of the purpose of the image. This summary will be show in a "bookmarked" image. The user just save this image, and we will create the best short, straight summary for this image.
</context>

<goal>
The summary must explain the purpose of the image.
The summary should NOT explain what is inside the image precisely, but more about what is for.
</goal>

<input>
We will give you the description of the image.
</input>

<output>
PLAIN TEXT without any formatting. Just that with what is the image for.
It should be 2-3 sentences maximum.
Start by "It's..."
</output>

Here are some examples of a PERFECT summary that you SHOULD follow :
`;

export const IMAGE_TITLE_PROMPT = `<context>
You are generating a title for an image. This title will be show in a "bookmarked" image. The user just save this image, and we will create the best short, straight title for this image.
</context>

<goal>
The title should be 4-5 words maximum.
It should describe the image in a way that is easy to understand.
</goal>

<input>
We will give you the description of the image.
</input>

<output>
Return only the title, 4-5 words maximum, no quotes, no explanation.
</output>
`;

export const YOUTUBE_SUMMARY_PROMPT = `<context>
Create a summary of the purpose of the youtube video. This summary will be show in a "bookmarked" youtube video. The user just save this video, and we will create the best short, straight summary for this video.
</context>

<goal>
The summary must explain the purpose of the video.
The summary should NOT explain what is inside the video precisely, but more about what is for.
You must create a summary that help the user to search this video.
</goal>

<input>
You will receive the transcript of the youtube video.
</input>

<output>
Return only the summary, 2-3 sentences maximum.
</output>
`;

export const YOUTUBE_VECTOR_SUMMARY_PROMPT = `<context>
You are generating a short, keyword-rich summary that captures the full purpose of a youtube video. This summary will be embedded into a vector database to enable precise semantic search among thousands of saved bookmarks.
</context>

<goal>
Write a dense, 3–4 sentence summary in **English only**, even if the input page is in another language. The summary must include as many relevant **keywords, brand names, tools, concepts, and use cases** as possible. Focus on what the page is about, who it is for, what value it offers, and how it can be used. Be specific and contextual.
Precise WHAT is the purpose of the website. Example : A landing page for selling a courses, for capturing leads... A portfolio, a documentation, a blog...
</goal>

<input>
You will receive the transcript of the youtube video.
</input>

<output>
Return **only plain text in English** (no formatting). Limit the output to 3–4 sentences, packed with relevant searchable terms.
</output>`;

export const VECTOR_SUMMARY_PROMPT = `<context>
You are generating a short, keyword-rich summary that captures the full purpose of a web page. This summary will be embedded into a vector database to enable precise semantic search among thousands of saved bookmarks.
</context>

<goal>
Write a dense, 3–4 sentence summary in **English only**, even if the input page is in another language. The summary must include as many relevant **keywords, brand names, tools, concepts, and use cases** as possible. Focus on what the page is about, who it is for, what value it offers, and how it can be used. Be specific and contextual.
Precise WHAT is the purpose of the website. Example : A landing page for selling a courses, for capturing leads... A portfolio, a documentation, a blog...
</goal>

<input>
You will receive the Markdown content of a web page.
</input>

<output>
Return **only plain text in English** (no formatting). Limit the output to 3–4 sentences, packed with relevant searchable terms.
</output>

Here are some examples of a PERFECT summary that you SHOULD follow :

<examples>
1. A landing page for selling a courses named BeginJavaScript is a comprehensive online course designed to help individuals master JavaScript through hands-on exercises, projects, and workshops. It offers a structured learning path, covering fundamental concepts to advanced topics like algorithms, DOM manipulation, asynchronous programming, and clean code practices. The course includes bonus content on TypeScript, AI-assisted learning, and access to a private Discord community for support. With a focus on practical application and real-world scenarios, BeginJavaScript aims to equip learners with the skills to excel in web development and launch their careers.
2. A landing page for a software product named Lumail.io is an AI-powered email marketing platform designed for creators and small businesses who prioritize simplicity and speed. It offers a frictionless editor, built-in AI for content improvement, transparent pricing, and essential features without unnecessary bloat, unlike Mailchimp and MailerLite. Lumail focuses on helping users create effective email campaigns, automate basic workflows, and connect with subscribers, especially targeting indie creators and solopreneurs. It provides a generous free plan and affordable paid options, emphasizing user-friendly design and efficient email marketing tools
</examples>
`;

export const TAGS_PROMPT = `<context>
You are generating exactly 3 tags for a webpage to categorize it in a bookmark database. You must follow strict rules about tag selection and format.

Tag Rules:
1. Always return EXACTLY 3 tags, no more, no less
2. Tags must be in lowercase, single words only (no phrases, spaces, or special characters)
3. First tag: MUST be one content type from this exact list:
   - "landing" (for product/service landing pages)
   - "coderepo" (for code repositories like GitHub/GitLab)
   - "capture" (for screenshots, captures, or temporary content)
   - "documentation" (for technical docs, API docs, guides)
   - "homepage" (for personal/company homepages)
   - "pricing" (for pricing pages)
   - "post" (for blog posts, articles, news)
   - "portfolio" (for portfolios, showcases)
   - "context" (for context/reference pages)
   - "dashboard" (for dashboards, analytics, admin panels)
   - "other" (only if none of the above fit)
4. Second and third tags: Simple theme/technology keywords that describe the main topic (e.g., "software", "courses", "ai", "react", "nextjs", "python", "design", "marketing", "productivity", "database", "api", "framework")
</context>

<goal>
Return exactly 3 tags:
1. One content type tag from the list above
2. Two theme/technology tags that best describe the content

Examples:
- GitHub React repository: ["coderepo", "react", "javascript"]
- Stripe pricing page: ["pricing", "payments", "saas"]
- Personal blog post about AI: ["post", "ai", "technology"]
- Next.js documentation: ["documentation", "nextjs", "react"]
</goal>

<input>
You will receive the full Markdown content of a web page.
</input>

<output>
Return only a valid JSON array of strings, each tag in lowercase. Example:

["saas", "ai", "chatgpt", "tools", "automation", "notion", "productivity"]

Never return anything else.
</output>
`;

export const IMAGE_ANALYSIS_PROMPT = `<context>
You are an expert in image analysis. You should make a precise description of the image.
</context>

<goal>
Return a precise description of the image.

Important: if the image is invalid, call the tool "invalid-image" with the reason. An image is considered invalid if it shows:
- Black or completely dark screens
- Unexpected error pages (403, 404, 500, etc.) that appear due to access issues
- Login or authentication pages (like "Sign in to continue")
- Captcha verification pages
- "Access denied" or "Permission required" messages
- Loading screens or placeholder content that doesn't show the actual webpage content
- Browser error messages or connection issues
- Pages that require login to view the actual content (like dev.to login walls)
</goal>

<input>
You will receive a screenshot of a webpage. You need to describe it with a precise description and everything you can tell about it.
</input>

<output>
Return a precise description of the image.
</output>
`;

export const TWEET_SUMMARY_PROMPT = `<context>
Create a summary of the purpose of the tweet. This summary will be show in a "bookmark" page. The user just save this tweet, and we will create the best short, straight summary for this application.
</context>

<goal>
The summary must explain the purpose of the tweet, what it explain to be easily search.
The summary should NOT explain what is inside the tweet precisely, but more about what is for.
</goal>

<input>
The user will give you the current markdown of the tweet.
</input>

<output>
PLAIN TEXT without any formatting. Just that with what is the page for.
It should be 2-3 sentences maximum.
</output>

Here are some examples of a PERFECT summary that you SHOULD follow :

<examples>
1. A tweet about an advice from Naval Ravikan explaining how to be successful in life. It emphasise on the importance of being a good person and the value of hard work.
</examples>
`;

export const TWEET_VECTOR_SUMMARY_PROMPT = `<context>
Create a summary of the purpose of the tweet. This summary will only be used internally for a vector database to enable precise semantic search among thousands of saved bookmarks.
</context>

<goal>
The summary should explain the purpose of the tweet, what is inside, what is for, what is about, and include a maximum of keywords.
</goal>

<input>
The user will give you the current markdown of the tweet.
</input>

<output>
PLAIN TEXT without any formatting. Just that with what is the page for.
It should be 2-3 sentences maximum.
</output>

`;

export const PDF_SUMMARY_PROMPT = `<context>
You are an expert in PDF analysis. Your description will be used for further IA to generate a summary.
</context>

<goal>
The summary should explain the purpose of the PDF, what is inside, what is for, what is about, and include a maximum of keywords.
</goal>

<input>
The user will give you the current PDF file and the screenshot description of the PDF.
</input>

<output>
PLAIN TEXT without any formatting.
</output>
`;

export const PDF_TITLE_PROMPT = `<context>
You are generating a title for a PDF. This title will be show in a "bookmark" page. The user just save this pdf, and we will create the best short, straight title for this application.
</context>

<goal>
The title should be 4-5 words maximum.
It should describe the PDF in a way that is easy to understand.
</goal>

<output>
Return only the title, 4-5 words maximum, no quotes, no explanation. No formatting.
</output>
`;

export const PRODUCT_SUMMARY_PROMPT = `<context>
Create a comprehensive summary of this e-commerce product page. This summary will be shown in a "bookmark" page. The user saved this product, and we will create the best detailed summary that captures the product's essence, purpose, and value proposition.
</context>

<goal>
The summary must explain:
- What the product is and what it does
- Who it's designed for and what problems it solves
- Key features and benefits that make it valuable
- The product category and use cases
- Why someone would want to buy or use this product

Focus on the product's utility, functionality, and target audience rather than just listing specifications.
</goal>

<input>
The user will provide product information including title, description, price, category, and other metadata.
</input>

<output>
PLAIN TEXT without any formatting.
It should be 3-4 sentences maximum.
Start by describing what the product is and its main purpose.
</output>

Here are examples of PERFECT product summaries:

<examples>
1. It's a wireless noise-cancelling headphone designed for professionals and commuters who need to focus in noisy environments. The headphones feature advanced active noise cancellation technology, 30-hour battery life, and premium sound quality for music, calls, and productivity. Perfect for remote workers, travelers, and audiophiles who value both comfort and performance during long listening sessions.

2. It's a smart fitness tracker designed for health-conscious individuals who want to monitor their daily activity, sleep, and wellness metrics. The device features heart rate monitoring, GPS tracking, water resistance, and a week-long battery life to help users maintain their fitness goals. Ideal for runners, gym enthusiasts, and anyone looking to improve their overall health and lifestyle habits.

3. It's a premium kitchen knife set designed for home cooks and culinary enthusiasts who demand professional-grade cutting performance. The set includes essential knives made from high-carbon steel with ergonomic handles, providing precision, durability, and comfort for all cooking tasks. Perfect for anyone who loves cooking and wants to elevate their kitchen skills with restaurant-quality tools.
</examples>
`;

export const PRODUCT_VECTOR_SUMMARY_PROMPT = `<context>
You are generating a comprehensive, keyword-rich summary of an e-commerce product that will be embedded into a vector database to enable precise semantic search among thousands of saved bookmarks.
</context>

<goal>
Write a dense, 3-4 sentence summary in **English only**, even if the input product is in another language. The summary must include as many relevant **product keywords, brand names, categories, features, use cases, target audiences, and technical specifications** as possible. Focus on what the product is, who it's for, what problems it solves, how it's used, and what makes it valuable. Be specific about the product category, intended users, and key benefits.
</goal>

<input>
You will receive product information including name, description, price, brand, category, and other metadata.
</input>

<output>
Return **only plain text in English** (no formatting). Limit the output to 3-4 sentences, packed with relevant searchable terms related to the product, its features, category, use cases, and target market.
</output>

Here are examples of PERFECT product vector summaries:

<examples>
1. Sony WH-1000XM4 wireless noise-cancelling over-ear headphones designed for professionals, travelers, audiophiles, commuters, and remote workers requiring premium audio quality and active noise cancellation. Features industry-leading ANC technology, 30-hour battery life, touch controls, quick charge, LDAC codec support, and comfortable ergonomic design for music listening, calls, podcasts, and productivity. Ideal for frequent flyers, office workers, students, musicians, and content creators who need superior sound isolation and wireless convenience for work, travel, gaming, and entertainment.

2. Fitbit Charge 5 advanced fitness tracker smartwatch for health monitoring, exercise tracking, sleep analysis, and wellness management targeting fitness enthusiasts, athletes, runners, and health-conscious individuals. Includes built-in GPS, heart rate monitoring, stress management, ECG readings, skin temperature sensors, 7-day battery life, water resistance, and smartphone notifications for comprehensive health and activity tracking. Perfect for gym workouts, running, cycling, swimming, yoga, and daily wellness monitoring for weight loss, fitness goals, and healthy lifestyle maintenance.

3. Wüsthof Classic 8-piece German kitchen knife set featuring high-carbon steel blades, ergonomic handles, and precision forging for professional cooking, meal preparation, and culinary tasks. Includes chef's knife, paring knife, utility knife, bread knife, and kitchen shears designed for home cooks, professional chefs, culinary students, and cooking enthusiasts. Essential for food preparation, vegetable chopping, meat cutting, bread slicing, and all kitchen tasks requiring sharp, durable, restaurant-quality cutlery tools.
</examples>
`;
