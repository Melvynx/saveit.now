## Refactor summary logic

I make a mistake when I create the application. We have 2 kind of summary :

- detailedSummaryEmbed
- summaryEmbed

In the beginning, I wanted a quick summary that will be showed in the app. Then I create this detailledSummary for the IA search (advanced-search)

Finally I think that we should DELETE the "summaryEmbed" and ONLY use "detailledSumaryEmbed".

But we also need to rename it, so it's like "vectorSummary" for a better name and then use it in the advanced-search.

For the "job" we still generate 2 summary :

- summary : small for easy understanding
- vectorSummary : bigger for AI search with more keyword and what for is the page

Then we vectorize only the vectorSummary that we only save has a vector summary.

We use the summary for the summary attributs only that we then show on bookmark-page.
