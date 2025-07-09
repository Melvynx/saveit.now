## PDF Bookmark

You need to support the PDF format for our application.

In the `apps/web/src/lib/inngest/process-bookmark.job.ts` if the file is PDF :

- Download the PDF
- Send to IA with attachement following the documentation of the AI SDK
- Make the description and find
- Upload the PDF to cloudflare so we saveit
- Use Worker to make a screenshot of a pdf with the right format using our worker and the generated url

## Worker

We need to find a way to make screenshot with worker. For this we can use apps/worker

**Task**: add a new GET route `/pdf` that returns a 1280 × 720 JPEG thumbnail of the first page of any public PDF.

**Specs**

1. Path: `/pdf?url=<public-pdf-URL>`.
2. Bindings: `BROWSER` (Workers Browser Rendering API).
3. Steps  
    a. Validate `url` query param – if missing or malformed, respond **400**.  
    b. `const page = await env.BROWSER.newPage({ viewport: { width: 1280, height: 720 } })`.  
    c. `await page.goto(\`data:text/html,<embed src="${encodeURI(url)}" type="application/pdf" style="width:100%;height:100%">\`, { waitUntil: 'networkidle0' })`.  
d. `const jpeg = await page.screenshot({ type: 'jpeg', quality: 80 })`.  
e. `await page.close()`.  
f. Return `new Response(jpeg, { headers: { 'Content-Type': 'image/jpeg' } })`with status **200**.  
g. Catch errors → status **500** with body`{ "error": "<msg>" }`.

## Things to think

- Add a new type "PDF" in our bookmark
- When click on the button for the pdf, open the local pdf files
- Create a perfect workflow for it

## Case

I try to save "https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf" and get this error : "cheerio.load() expects a string"
