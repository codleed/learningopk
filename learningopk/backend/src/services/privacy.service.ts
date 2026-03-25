import { eq } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import { privacySettings } from "../lib/db/schema.js";

export interface PrivacySettings {
  searchability: {
    allowFindMeBySearch: boolean;
    allowSearchByName: boolean;
    allowSearchByBoard: boolean;
    allowSearchByInstitution: boolean;
  };
  visibility: {
    profileVisibility: "everyone" | "friends_only" | "nobody";
    showBoard: boolean;
    showClass: boolean;
    showOnlineStatus: boolean;
    showLastSeen: boolean;
  };
  friendRequests: {
    whoCanSendRequests: "everyone" | "friends_of_friends";
  };
  chat: {
    whoCanMessageMe: "friends_only" | "everyone" | "nobody";
    showReadReceipts: boolean;
    showTypingIndicators: boolean;
  };
}

const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  searchability: {
    allowFindMeBySearch: true,
    allowSearchByName: true,
    allowSearchByBoard: true,
    allowSearchByInstitution: false
  },
  visibility: {
    profileVisibility: "everyone",
    showBoard: true,
    showClass: true,
    showOnlineStatus: true,
    showLastSeen: true
  },
  friendRequests: {
    whoCanSendRequests: "everyone"
  },
  chat: {
    whoCanMessageMe: "friends_only",
    showReadReceipts: true,
    showTypingIndicators: true
  }
};

export class PrivacyService {
  async getPrivacySettings(userId: string): Promise<PrivacySettings> {
    const rows = await db
      .select({
        whoCanFindMe: privacySettings.whoCanFindMe,
        whoCanSendRequest: privacySettings.whoCanSendRequest,
        showOnlineStatus: privacySettings.showOnlineStatus,
        showLastSeen: privacySettings.showLastSeen
      })
      .from(privacySettings)
      .where(eq(privacySettings.userId, userId))
      .limit(1);

    if (rows.length === 0) {
      return DEFAULT_PRIVACY_SETTINGS;
    }

    const settingsRow = rows[0];
    return {
      searchability: {
        allowFindMeBySearch: settingsRow.whoCanFindMe !== "nobody",
        allowSearchByName: true,
        allowSearchByBoard: true,
        allowSearchByInstitution: false
      },
      visibility: {
        profileVisibility: "everyone",
        showBoard: true,
        showClass: true,
        showOnlineStatus: settingsRow.showOnlineStatus ?? true,
        showLastSeen: settingsRow.showLastSeen ?? true
      },
      friendRequests: {
        whoCanSendRequests: settingsRow.whoCanSendRequest === "friends_of_friends" ? "friends_of_friends" : "everyone"
      },
      chat: {
        whoCanMessageMe: "friends_only",
        showReadReceipts: true,
        showTypingIndicators: true
      }
    };
  }

  async updatePrivacySettings(
    userId: string,
    updates: Partial<PrivacySettings>
  ): Promise<{ success: boolean; updatedSettings: PrivacySettings }> {
    let settings = await this.getPrivacySettings(userId);

    if (updates.searchability) {
      if (updates.searchability.allowFindMeBySearch !== undefined) {
        settings.searchability.allowFindMeBySearch = updates.searchability.allowFindMeBySearch;
      }
      if (updates.searchability.allowSearchByName !== undefined) {
        settings.searchability.allowSearchByName = updates.searchability.allowSearchByName;
      }
      if (updates.searchability.allowSearchByBoard !== undefined) {
        settings.searchability.allowSearchByBoard = updates.searchability.allowSearchByBoard;
      }
      if (updates.searchability.allowSearchByInstitution !== undefined) {
        settings.searchability.allowSearchByInstitution = updates.searchability.allowSearchByInstitution;
      }
    }

    if (updates.visibility) {
      if (updates.visibility.profileVisibility !== undefined) {
        settings.visibility.profileVisibility = updates.visibility.profileVisibility;
      }
      if (updates.visibility.showBoard !== undefined) {
        settings.visibility.showBoard = updates.visibility.showBoard;
      }
      if (updates.visibility.showClass !== undefined) {
        settings.visibility.showClass = updates.visibility.showClass;
      }
      if (updates.visibility.showOnlineStatus !== undefined) {
        settings.visibility.showOnlineStatus = updates.visibility.showOnlineStatus;
      }
      if (updates.visibility.showLastSeen !== undefined) {
        settings.visibility.showLastSeen = updates.visibility.showLastSeen;
      }
    }

    if (updates.friendRequests) {
      if (updates.friendRequests.whoCanSendRequests !== undefined) {
        settings.friendRequests.whoCanSendRequests = updates.friendRequests.whoCanSendRequests;
      }
    }

    if (updates.chat) {
      if (updates.chat.whoCanMessageMe !== undefined) {
        settings.chat.whoCanMessageMe = updates.chat.whoCanMessageMe;
      }
      if (updates.chat.showReadReceipts !== undefined) {
        settings.chat.showReadReceipts = updates.chat.showReadReceipts;
      }
      if (updates.chat.showTypingIndicators !== undefined) {
        settings.chat.showTypingIndicators = updates.chat.showTypingIndicators;
      }
    }

    const existingRows = await db
      .select({ id: privacySettings.id })
      .from(privacySettings)
      .where(eq(privacySettings.userId, userId))
      .limit(1);

    const whoCanFindMeValue =
      settings.searchability.allowFindMeBySearch && settings.searchability.allowSearchByName
        ? "everyone"
        : settings.searchability.allowFindMeBySearch
          ? "friends_of_friends"
          : "nobody";

    if (existingRows.length === 0) {
      await db.insert(privacySettings).values({
        userId,
        whoCanFindMe: whoCanFindMeValue,
        whoCanSendRequest: settings.friendRequests.whoCanSendRequests,
        showOnlineStatus: settings.visibility.showOnlineStatus,
        showLastSeen: settings.visibility.showLastSeen
      });
    } else {
      await db
        .update(privacySettings)
        .set({
          whoCanFindMe: whoCanFindMeValue,
          whoCanSendRequest: settings.friendRequests.whoCanSendRequests,
          showOnlineStatus: settings.visibility.showOnlineStatus,
          showLastSeen: settings.visibility.showLastSeen
        })
        .where(eq(privacySettings.userId, userId));
    }

    return { success: true, updatedSettings: settings };
  }

  async ensurePrivacySettings(userId: string): Promise<void> {
    const rows = await db
      .select({ id: privacySettings.id })
      .from(privacySettings)
      .where(eq(privacySettings.userId, userId))
      .limit(1);

    if (rows.length === 0) {
      await db.insert(privacySettings).values({
        userId,
        whoCanFindMe: "everyone",
        whoCanSendRequest: "everyone"
      });
    }
  }
}

export const privacyService = new PrivacyService();
