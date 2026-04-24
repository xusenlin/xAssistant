import { create } from "zustand";
import { Conversation, Agent } from "@/../bindings/xAssistant/internal/models";
import { ConversationService, AgentService, ChatService } from "@/../bindings/xAssistant/internal/services";

interface ChatStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  currentAgent: Agent | null;

  loadConversations: () => Promise<void>;
  setActiveConversation: (id: string) => Promise<void>;
  createConversation: (title: string, agentId: string) => Promise<Conversation | null>;
  refreshTitle: () => Promise<void>;
  clearCurrentConversation: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  currentAgent: null,

  loadConversations: async () => {
    try {
      const data = await ConversationService.GetAll();
      const filtered = (data || []).filter((c): c is Conversation => c !== null);
      set({ conversations: filtered });
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  },

  setActiveConversation: async (id: string) => {
    set({ activeConversationId: id, currentAgent: null });

    const conv = get().conversations.find((c) => c.id === id);
    if (conv?.agent_id) {
      try {
        const agentData = await AgentService.GetByID(conv.agent_id);
        set({ currentAgent: agentData });
      } catch (error) {
        console.error("Failed to load agent:", error);
      }
    }
  },

  createConversation: async (title: string, agentId: string) => {
    try {
      const conv = await ConversationService.Create(title, agentId, "simple");
      if (conv) {
        await get().loadConversations();
      }
      return conv;
    } catch (error) {
      console.error("Failed to create conversation:", error);
      return null;
    }
  },

  refreshTitle: async () => {
    const activeId = get().activeConversationId;
    if (!activeId) return;
    try {
      const title = await ChatService.GenerateTitle(activeId);
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === activeId ? { ...c, title } : c
        ),
      }));
    } catch (error) {
      console.error("Failed to refresh title:", error);
    }
  },

  clearCurrentConversation: () => {
    set({ activeConversationId: null, currentAgent: null });
  },
}));
