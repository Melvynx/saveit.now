import { APP_LINKS } from "@/lib/app-links";
import { getServerUrl } from "@/lib/server-url";

export const EMAILS = {
  WELCOME_EMAIL: `Hi,

I'm Melvyn, the founder of SaveIt.now.

I built this app because I had over 500 bookmarks and I kept losing the good ones. Chrome bookmarks weren't helping, and Notion felt too heavy.

SaveIt.now is my solution — a minimal, fast, and smart way to save and find links. It uses AI to summarize content, generate tags, take screenshots, and make everything searchable instantly.

This tool is something I use daily, and I'll keep improving it as long as I need it myself.

Here's how to get started:

1. Install the Extension:  
${getServerUrl()}${APP_LINKS.extensions}

2. Open the app and save your first link:  
${getServerUrl()}${APP_LINKS.app}

If you hit a problem or just want to share feedback, write me at help@saveit.now or DM me on Twitter: https://x.com/melvynxdev

Thanks for trying SaveIt.now.  
Melvyn`,

  CHROME_EXTENSION_EMAIL: `Hi,

I'm Melvyn, the founder of SaveIt.now.

I noticed you haven't installed the Chrome extension yet. The extension is the fastest way to save bookmarks while browsing.

Here's why you should install it:

✅ Save any page with one click
✅ AI automatically generates tags and summaries
✅ Works on any website
✅ Syncs instantly with your SaveIt.now account

Install the Extension here:
${getServerUrl()}${APP_LINKS.extensions}

Once installed, you can save bookmarks directly from any webpage. Just click the SaveIt.now icon in your browser toolbar.

Best,
Melvyn`,

  HOW_USE_CHROME_EXTENSION_EMAIL: `Hi,

The chrome extension lets you save images and bookmarks from any website.

For example, you find "Supabase UI" beautiful and want to save it, just click on the corner (make sure you pin the extension) to save the bookmark:

You can also right click on any website to save the page.

Finally, you can right click on any image to save it.

After the image is saved, you'll be able to search it because our AI analyzes the image and generates a description.

So... if you don't have the extension yet, download it here: ${getServerUrl()}${APP_LINKS.extensions}

Best,
Melvyn`,

  HOW_TO_IMPORT_BOOKMARKS_EMAIL: `Hi,

You might have Chrome bookmarks or other tools bookmarks that you want to import.

For that you can just go to the import page: ${getServerUrl()}${APP_LINKS.imports}

In this page, it's really simple...

You can drag and drop any file:

• csv
• html  
• pdf

And we will extract the links for import. We don't support importing tags, text or anything else for our commitment to minimalism.

You can also just copy/paste any list of links into the input.

And that's it! 📋

The import can take a while... on average, it's 30 seconds per bookmark. If you import 20 bookmarks, it will take 10 minutes.

Best,
Melvyn`,

  HOW_TO_USE_BOOKMARKS_EMAIL: `Hi,

I see you're getting started with SaveIt.now! Here are some tips to help you get the most out of your bookmarks:

1. Save more than just links

Articles, videos, tweets, images, save anything valuable.

2. Save more than you think

Every time you find something valuable... even if you're not sure: save it.

You don't need to "cherry-pick" the best ones... just save everything.

Our system will help you find them later.

3. Do not organize

No need to organize, add notes, or tags. Our software is intelligent and will help you find them later.

Try saving a few more bookmarks and see how the AI helps organize them automatically.

Start saving: ${getServerUrl()}${APP_LINKS.app}

Best,
Melvyn`,

  HOW_TO_SEARCH_BOOKMARKS_EMAIL: `Hi,

Now that you have some bookmarks saved, let me show you how to find them quickly:

🔍 Smart Search

Type anything related to your bookmark - title, content, or tags. The AI understands context, so "React tutorial" will find React-related content.

Quick Filters

Filter by tags, dates, or bookmark types. Use the sidebar to browse by categories.

Advanced Search

Search within specific date ranges. Find bookmarks by domain or content type. Combine multiple filters for precise results.

Pro Tips

Use the search bar at the top of any page. Bookmark important searches for quick access. The more you save, the smarter the search becomes.

Try searching for something now: ${getServerUrl()}${APP_LINKS.app}

Best,
Melvyn`,

  PREMIUM_COMMITMENT_EMAIL: `Hi,

I hope SaveIt.now has been helpful in organizing your bookmarks!

As a founder, I'm committed to building the best bookmark manager possible. Here's what I'm working on:

🚀 What's Coming Next

Better AI summaries and tagging. Team collaboration features. Mobile app improvements. Advanced search filters.

💪 My Commitment

I use SaveIt.now daily for my own bookmarks. Regular updates and improvements. Direct support from me personally. No ads, ever - just a clean, fast experience.

📈 Ready to Go Premium?

Upgrade to unlock unlimited bookmarks, priority support, and early access to new features.

Upgrade now: ${getServerUrl()}${APP_LINKS.upgrade}

Thanks for being part of the SaveIt.now community!

Best,
Melvyn

P.S. Hit reply if you have any feedback or questions - I read every email personally.`,

  // Subscription emails
  SUBSCRIPTION_THANK_YOU_EMAIL: `Hey,

Thank you so much for your trust!

You just upgraded to the PRO plan and I really want to personally thank you.

As a founder, it's important for me.

If you want to reach out by email or say anything, feel free and I'll reply as soon as possible.

Your money helps me build the best bookmark manager possible.

If you need help, reach me on Twitter @melvynxdev or just reply to this email.

I'll reply as soon as possible.

Best,
Melvyn`,

  SUBSCRIPTION_HOW_TO_USE_PREMIUM_EMAIL: `Hi,

Let me show you how to use your premium effectively:

With premium, you have unlimited bookmarks (with fair usage). Save everything you find online.

If a website generates wrong content, just use the report button so I can check it.

That's it! Start saving everything: ${getServerUrl()}${APP_LINKS.app}

Best,
Melvyn`,

  SUBSCRIPTION_LETS_TALK_EMAIL: `Hi,

Let's talk? 💬

I don't like calls, but I like email and voice. Just reply to this email to help me know:

• Why you joined premium
• How we can help you
• What you like
• What you dislike

I read every email personally.

Best,
Melvyn`,

  SUBSCRIPTION_OUR_COMMITMENT_EMAIL: `Hi,

As a pro member, I want to make you a promise.

My commitment to you:

1. Simplicity is the key. No extra features. Just the features you need.
2. No ads. No tracking. No data collection.
3. Extra layers of database security (our database is backed up to avoid any data loss)

We avoid useless features, but still, we create a lot of micro improvements that you can find here: ${getServerUrl()}${APP_LINKS.changelog}

Thanks for being pro!

Best,
Melvyn`,

  // Limit reached emails
  LIMIT_REACHED_DISCOUNT_EMAIL: (promoCode: string) => `Hi,

You reached your bookmark limit 🥲

I see you're really using SaveIt.now. That's awesome!

Here's a special discount just for you:

* First month for only $1 (instead of $9)
* Or yearly plan with $8 OFF

Use code: \`${promoCode}\`

**This code expires in 2 days and is only for you.**

Upgrade now: ${getServerUrl()}${APP_LINKS.upgrade}

When you are on this page, just choose yearly or monthly pricing and then add the coupon during the checkout : 

<img src="${getServerUrl()}/images/coupon.png" alt="Limit reached discount" />

Best,
Melvyn`,

  LIMIT_REACHED_REMINDER_EMAIL: (promoCode: string) => `Hi,

Remember: you have a special discount! 💰

Your promo code \`${promoCode}\` is still valid for:

* First month at only $1
* Or yearly plan with $8 OFF

Don't miss out - it expires tomorrow.

Upgrade now: ${getServerUrl()}${APP_LINKS.upgrade}

Best,
Melvyn`,

  LIMIT_REACHED_LAST_CHANCE_EMAIL: (promoCode: string) => `Hi,

Last chance: today only $1 for the first month! ⏰

Your code \`${promoCode}\` expires today.

This is your final reminder to get premium for just $1.

After today, it goes back to the regular price.

Upgrade now: ${getServerUrl()}${APP_LINKS.upgrade}

Best,
Melvyn`,
};
