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
You are generating a concise and relevant list of tags for a webpage. These tags will be used for intelligent search inside a large bookmark database. Tags should describe what the page is, what it contains, what it is used for, and any technologies, tools, products, or keywords that appear.

Tags must always be in lowercase and be single full words (no phrases, no formatting, no hashtags). Focus on category, purpose, and specific terminology. Prioritize meaningful tags that would help someone find this page by topic or intent.
</context>

<goal>
Return only the most relevant and specific tags, between 5 and 15 total. Tags should include:
- The type of page (e.g. landing, blog, saas, portfolio, tool, docs)
- Product names (e.g. chatgpt, notion, prisma)
- Categories (e.g. ai, productivity, design, devtools, seo)
- Use cases (e.g. automation, writing, analytics)

Avoid vague tags. Include only what’s useful for filtering or searching.

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

Important : if the image is invalid, call the tool "invalid-image" with the reason.
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
