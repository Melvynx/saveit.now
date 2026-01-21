import { prisma } from "@workspace/database";
import type { UIMessage } from "ai";

export type ConversationListItem = {
  id: string;
  title: string | null;
  updatedAt: Date;
  createdAt: Date;
};

export type ConversationWithMessages = {
  id: string;
  title: string | null;
  messages: UIMessage[];
  updatedAt: Date;
  createdAt: Date;
};

export async function getUserConversations(
  userId: string,
  limit = 50,
): Promise<ConversationListItem[]> {
  const conversations = await prisma.chatConversation.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      createdAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  return conversations;
}

export async function getConversation(
  id: string,
  userId: string,
): Promise<ConversationWithMessages | null> {
  const conversation = await prisma.chatConversation.findFirst({
    where: { id, userId },
    select: {
      id: true,
      title: true,
      messages: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  if (!conversation) return null;

  return {
    ...conversation,
    messages: conversation.messages as unknown as UIMessage[],
  };
}

export async function createConversation(userId: string): Promise<string> {
  const conversation = await prisma.chatConversation.create({
    data: {
      userId,
      messages: [],
    },
    select: { id: true },
  });

  return conversation.id;
}

export async function updateConversationMessages(
  id: string,
  userId: string,
  messages: UIMessage[],
): Promise<void> {
  await prisma.chatConversation.updateMany({
    where: { id, userId },
    data: {
      messages: messages as unknown as object[],
    },
  });
}

export async function updateConversationTitle(
  id: string,
  userId: string,
  title: string,
): Promise<void> {
  await prisma.chatConversation.updateMany({
    where: { id, userId },
    data: { title },
  });
}

export async function deleteConversation(
  id: string,
  userId: string,
): Promise<void> {
  await prisma.chatConversation.deleteMany({
    where: { id, userId },
  });
}

export async function updateConversationLikes(
  id: string,
  userId: string,
  delta: number,
): Promise<void> {
  await prisma.chatConversation.updateMany({
    where: { id, userId },
    data: {
      likes: {
        increment: delta,
      },
    },
  });
}

export type ConversationWithLikes = {
  id: string;
  title: string | null;
  likes: number;
  updatedAt: Date;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    name: string;
  };
};

export async function getConversationsWithLikes(): Promise<
  ConversationWithLikes[]
> {
  const conversations = await prisma.chatConversation.findMany({
    where: {
      likes: {
        not: 0,
      },
    },
    select: {
      id: true,
      title: true,
      likes: true,
      updatedAt: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: { likes: "desc" },
  });

  return conversations;
}

export type ConversationWithMessagesAdmin = {
  id: string;
  title: string | null;
  messages: UIMessage[];
  likes: number;
  updatedAt: Date;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    name: string;
  };
};

export async function getConversationAdmin(
  id: string,
): Promise<ConversationWithMessagesAdmin | null> {
  const conversation = await prisma.chatConversation.findFirst({
    where: { id },
    select: {
      id: true,
      title: true,
      messages: true,
      likes: true,
      updatedAt: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  if (!conversation) return null;

  return {
    ...conversation,
    messages: conversation.messages as unknown as UIMessage[],
  };
}
