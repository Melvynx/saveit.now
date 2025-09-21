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
Write a dense, 3–4 sentence summary in **English only**, even if the input page is in another language.
The summary must include as many relevant **keywords, brand names, tools, concepts, and use cases** as possible. Focus on what the page is about, who it is for, what value it offers, and how it can be used. Be specific and contextual.
The summary must include as many relevant keywords, tools and use cases that is necessary to understand the full purpose of the page.

**AVOID technical specifications, measurements, dimensions, weights, prices, detailed numerical values, compliance certifications, specific customer company names, specific technology names, platform names, hosting location details, and infrastructure details.** Focus on functionality, purpose, design philosophy, and target audience instead.
**AVOID to replicate what the page say**, we focus only on useful and searchable informations.
**AVOID listing specific company names, platform names, or technology names as examples** - use general descriptions like "web platforms", "development frameworks", or "popular tools".
**AVOID mentioning hosting details, geographic locations, or technical implementation specifics** - focus purely on the purpose and value proposition.

Precise WHAT is the purpose of the page :

<examples>
- A user blog that shows the latest posts, mainly about web development frameworks.
- A landing page to capture leads for a SaaS product.
- A landing page to present courses about creating viral short videos on social media platforms.
</examples>

Precise WHAT is the page about :

<examples>
- An email plateform to send email and transactional marketing at scale.
- A chrome extensions to copy the content of the page in a markdown format, so it's easier to send to LLM.
- A software to send e-mail marketing for SaaS, focus on workflow and automation.
</examples>

Precise WHAT is the "target" :

<examples>
- Target web developers in big companies looking for email services.
- Target new developers that want to learn programming languages.
</examples>

Precise KEYWORD, competitor, example compagny :

<examples>
- It's a competitor to traditional email service providers.
- It's a competitor to popular programming courses and learning platforms.
- It's a template for modern web development with popular frameworks and services.
</examples>

</goal>

<input>
You will receive the Markdown content of a web page.
</input>

<output>
Return **only plain text in English** (no formatting). Limit the output to 3–4 sentences, packed with relevant searchable terms.
</output>

Here are some examples of a PERFECT summary that you SHOULD follow :

<examples>
1. Resend is an email platform for sending transactional and marketing email. It's for developers that need to send email with a simple developer experience. It offers email template functionality and competes with traditional email service providers.
2. AI Builder Club is a community and learning platform focused on AI coding, AI agents and LLM applications. It offers courses, tools and resources to help developers launch AI products faster with SaaS development resources. It targets those seeking to build AI-powered applications and offers resources for both beginners and experienced developers.
3. Mintlify is an AI-powered documentation platform designed for collaboration and ease of use, targeting startups and enterprises. It enables self-updating knowledge management with a context-aware writer and offers intelligent assistance to users through an AI assistant. It integrates with enterprise knowledge systems, providing compliance and access control features. It helps companies scale their documentation and improve developer experience.
</examples>`;

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

export const PRODUCT_DISPLAY_SUMMARY_PROMPT = `<context>
Create a simple, memorable summary of what this product DOES for easy reading and quick understanding.
</context>

<goal>
Write a concise 1-2 sentence summary in **English only**. Focus on the core purpose, target users, and main value proposition using simple, everyday language.

**AVOID technical specifications, measurements, dimensions, weights, prices, and detailed numerical values.** Focus on functionality, purpose, and who it's for.

Focus on:
1. The MAIN PURPOSE - what problem does it solve?
2. WHO uses it and WHY they need it
3. KEY concepts and use cases that matter

Be simple and clear. Imagine explaining it to a friend who asks "what's that thing you bookmarked?"
</goal>

<input>
Product information including title, description, price, and metadata.
</input>

<output>
PLAIN TEXT without formatting.
1-2 sentences maximum.
Start with "It's..."
Use everyday language and relevant keywords.
</output>

<examples>
1. It's a card holder that keeps your task cards organized and visible on your desk. Perfect for people who use analog planning systems to stay productive.

2. It's a camera gear organizer that keeps your batteries and memory cards in one place. Made for photographers who need quick access to their accessories.

3. It's noise-canceling headphones for blocking out distractions. Great for anyone who needs to focus while working or traveling.

4. It's a fitness tracker that monitors your daily activity and sleep. Helps health-conscious people stay on top of their wellness goals.
</examples>
`;

export const PRODUCT_SEARCH_SUMMARY_PROMPT = `<context>
You are generating a short, keyword-rich summary that captures the full purpose of a product. This summary will be embedded into a vector database to enable precise semantic search among thousands of saved bookmarks.
</context>

<goal>
Write a dense, 3–4 sentence summary in **English only**, even if the input product is in another language. The summary must include as many relevant **keywords, brand names, tools, concepts, and use cases** as possible. Focus on what the product is about, who it is for, what value it offers, and how it can be used. Be specific and contextual.

**AVOID technical specifications, measurements, dimensions, weights, prices, and detailed numerical values.** Focus on functionality, purpose, materials, design philosophy, and target audience instead.

Precise WHAT is the purpose of the product :

- A bag specifically designed for carrying laptops and tech gear
- A todo list analog planner for productivity enthusiasts

Precise WHAT is the product :

- It's a wood and leather backpack with brass hardware and minimalist design
- It's a physical notebook with dated pages, space for goals, and habit tracking with clean aesthetics

Precise WHAT is the "target" :

- It's a premium alternative to high-end laptop bags like Nomatic, Peak Design, and Bellroy
- It's a quality alternative to mainstream earbuds like Apple AirPods
  </goal>

<input>
You will receive the Markdown content of a web page.
</input>

<output>
Return **only plain text in English** (no formatting). Limit the output to 3–4 sentences, packed with relevant searchable terms.
</output>

Here are some examples of a PERFECT summary that you SHOULD follow :

<examples>
1. This is a minimalist white analog notebook that combines daily dated pages, goal-setting space, and habit tracking for productivity enthusiasts, students, and professionals. Designed as a physical alternative to digital todo list apps like Notion, Todoist, and Trello, it helps users plan work, track progress, and stay focused. With premium paper quality and structured layouts, it functions as a hybrid productivity system for journaling, time management, and self-improvement. Ideal for those who want a tactile, distraction-free planning tool.
2. This is a pair of premium wireless earbuds that deliver immersive spatial audio, world-class active noise cancellation, and crystal-clear call quality for music lovers, frequent travelers, and professionals. With Bluetooth 5.3, multipoint pairing, and customizable EQ through a companion app, they offer deep bass, crisp highs, and adaptive sound tailored to any environment. Built with an ergonomic fit and up to 24 hours of battery life including the charging case, they rival high-end alternatives like Apple AirPods Pro, Sony WF-1000XM5, and Sennheiser Momentum True Wireless. Perfect for commuting, flights, workouts, and office use, they combine luxury design with cutting-edge audio performance.
</examples>

`;
