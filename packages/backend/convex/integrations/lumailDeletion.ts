export const LUMAIL_WORKFLOW_V2_IDS = [
  "H3SVwwW3yD0",
  "ydcah81hFWL",
  "5MZSI86caoG",
] as const;

type LumailDeletionClient = {
  tools: {
    run: (
      toolName: string,
      params: { workflowId: string; email: string },
    ) => Promise<unknown>;
  };
  subscribers: {
    delete: (email: string) => Promise<unknown>;
  };
};

export async function cancelWorkflowRunsAndDeleteSubscriber(
  lumail: LumailDeletionClient,
  email: string,
): Promise<void> {
  for (const workflowId of LUMAIL_WORKFLOW_V2_IDS) {
    await lumail.tools.run("remove_subscriber_from_workflow_v2", {
      workflowId,
      email,
    });
  }
  await lumail.subscribers.delete(email);
}
