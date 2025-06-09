"use client";

import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Text } from "@workspace/ui/components/text";
import { CreateBookmarkTool, GetBookmarkTool, SearchBookmarksTool } from "@/components/chat/bookmark-tools";
import { useChat } from "ai/react";
import { BookmarkIcon, MessageCircleIcon, SendIcon, BotIcon, UserIcon, SparklesIcon } from "lucide-react";
import { useEffect, useRef } from "react";

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  });

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const renderToolCall = (toolCall: any) => {
    const { toolName, args, result } = toolCall;

    switch (toolName) {
      case "createBookmark":
        return <CreateBookmarkTool result={result} />;
      case "searchBookmarks":
        return <SearchBookmarksTool result={result} query={args.query} />;
      case "getBookmark":
        return <GetBookmarkTool result={result} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 fixed inset-0">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
            <SparklesIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <Text className="text-xl font-semibold">Bookmark Assistant</Text>
            <Text className="text-sm text-muted-foreground">
              Search, create, and manage your bookmarks with AI
            </Text>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4">
                <MessageCircleIcon className="h-8 w-8 text-white" />
              </div>
              <Text className="text-xl font-semibold mb-2">
                Welcome to your Bookmark Assistant!
              </Text>
              <Text className="text-muted-foreground mb-6 max-w-md mx-auto">
                I can help you search through your bookmarks, create new ones, or get detailed information about specific bookmarks. Just ask me anything!
              </Text>
              <div className="grid gap-3 max-w-lg mx-auto">
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BookmarkIcon className="h-4 w-4 text-blue-600" />
                      <Text className="font-medium text-blue-900">Example commands:</Text>
                    </div>
                    <div className="space-y-1 text-sm text-blue-700">
                      <Text>• "Search for articles about React"</Text>
                      <Text>• "Create a bookmark for https://example.com"</Text>
                      <Text>• "Show me bookmarks tagged with 'javascript'"</Text>
                      <Text>• "Find my most recent bookmarks"</Text>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className="space-y-4">
              {/* User Message */}
              {message.role === "user" && (
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full flex-shrink-0">
                    <UserIcon className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1 bg-white rounded-lg p-4 shadow-sm border">
                    <Text className="whitespace-pre-wrap">{message.content}</Text>
                  </div>
                </div>
              )}

              {/* Assistant Message */}
              {message.role === "assistant" && (
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex-shrink-0">
                    <BotIcon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 space-y-3">
                    {message.content && (
                      <div className="bg-white rounded-lg p-4 shadow-sm border">
                        <Text className="whitespace-pre-wrap">{message.content}</Text>
                      </div>
                    )}
                    
                    {/* Tool Calls */}
                    {message.toolInvocations?.map((toolCall) => (
                      <div key={toolCall.toolCallId}>
                        {renderToolCall(toolCall)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex-shrink-0">
                <BotIcon className="h-4 w-4 text-white" />
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  </div>
                  <Text className="text-muted-foreground">Thinking...</Text>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-white px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask me about your bookmarks..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="px-6"
            >
              <SendIcon className="h-4 w-4" />
            </Button>
          </form>
          <Text className="text-xs text-muted-foreground mt-2 text-center">
            I can search bookmarks, create new ones, or get detailed information about any bookmark.
          </Text>
        </div>
      </div>
    </div>
  );
}