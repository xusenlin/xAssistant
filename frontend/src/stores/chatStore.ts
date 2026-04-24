import { create } from "zustand";
import { Conversation, Agent } from "@/../bindings/xAssistant/internal/models";
import { ConversationService, AgentService } from "@/../bindings/xAssistant/internal/services";

interface ChatStore {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  currentAgent: Agent | null;

  loadConversations: () => Promise<void>;
  loadCurrentConversation: (id: string) => Promise<void>;
  createConversation: (title: string, agentId: string) => Promise<Conversation | null>;
  clearCurrentConversation: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  currentConversation: null,
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

  loadCurrentConversation: async (id: string) => {
    try {
      const conv = await ConversationService.GetByID(id);
      set({ currentConversation: conv, currentAgent: null });

      if (conv?.agent_id) {
        const agentData = await AgentService.GetByID(conv.agent_id);
        set({ currentAgent: agentData });
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
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

  clearCurrentConversation: () => {
    set({ currentConversation: null, currentAgent: null });
  },
}));
