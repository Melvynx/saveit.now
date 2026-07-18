const faqs = [
  {
    question: 'What does "agentic" mean?',
    answer:
      "Agentic AI doesn't just respond - it acts autonomously. While most AI tools wait for you to give commands, agentic systems make decisions and take action on their own. Your SaveIt agent automatically organizes your bookmarks, learns your patterns, and retrieves content before you even search.",
  },
  {
    question: "Can I cancel any time?",
    answer:
      "Yes. Manage or cancel from the billing provider you used. Pro stays active until the end of your current billing period.",
  },
  {
    question: "Do I have a limit?",
    answer:
      "Free includes up to 20 bookmarks, 20 AI bookmark runs, and 10 chat questions each month. Pro includes up to 50,000 bookmarks, 1,500 AI runs, and 200 chat questions each month.",
  },
  {
    question: "How to upgrade my plan?",
    answer:
      "Choose Upgrade to Pro during setup or from the pricing page, sign in to the account you want to upgrade, then complete the secure checkout.",
  },
  {
    question: "Is my data sent to any server?",
    answer:
      "Yes, your bookmarks are stored on our servers so you can access them from any device. We use encryption and never share your data with third parties.",
  },
  {
    question: "Do you offer refunds?",
    answer:
      "Yes, we offer a 7-day refund guarantee. Just contact hi@saveit.now and get an instant refund. No questions asked.",
  },
];

export const FAQ = () => {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 lg:py-28">
      <h2 className="font-elegant text-4xl tracking-tight text-[#fafafa] md:text-5xl">
        Questions <em>& answers</em>
      </h2>

      <div className="mt-12 grid gap-x-16 gap-y-10 md:grid-cols-2">
        {faqs.map((faq) => (
          <div key={faq.question}>
            <h3 className="text-[15px] font-medium text-[#fafafa]">
              {faq.question}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[#888]">
              {faq.answer}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
