'use server'

import { listChats } from '@/lib/chat-store'

const CHAT_PAGE_SIZE = 5

export async function getSidebarChats() {
  try {
    const [favoriteChats, recentChats] = await Promise.all([listFavoriteChats(), listRecentChats()])

    return { favoriteChats, recentChats }
  } catch {
    return {
      favoriteChats: [],
      recentChats: { chats: [], cursor: null },
    }
  }
}

async function listFavoriteChats() {
  const page = listChats({
    limit: CHAT_PAGE_SIZE,
    metadata: { favorite: 'true' },
  })

  return page.chats
}

async function listRecentChats() {
  const page = listChats({
    limit: CHAT_PAGE_SIZE,
  })

  return {
    chats: page.chats.filter((chat) => chat.metadata.favorite !== 'true'),
    cursor: page.cursor,
  }
}