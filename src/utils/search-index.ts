/**
 * 优化的搜索索引
 * 使用前缀树（Trie）和倒排索引加速搜索
 */

export interface SearchToken {
  text: string
  score: number
}

/**
 * 前缀树节点
 */
class TrieNode {
  children = new Map<string, TrieNode>()
  items = new Set<string>() // 存储工具 ID
  isEndOfWord = false
}

/**
 * 前缀树搜索索引
 */
export class SearchIndex<T extends { id: string }> {
  private root = new TrieNode()
  private itemsById = new Map<string, T>()

  /**
   * 构建索引
   */
  build(items: T[], tokenizer: (item: T) => SearchToken[]) {
    this.clear()

    for (const item of items) {
      this.itemsById.set(item.id, item)
      const tokens = tokenizer(item)

      for (const token of tokens) {
        this.insert(token.text, item.id)
      }
    }
  }

  /**
   * 插入词条到前缀树
   */
  private insert(word: string, itemId: string) {
    let node = this.root
    const normalized = word.toLowerCase()

    for (const char of normalized) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode())
      }
      node = node.children.get(char)!
      node.items.add(itemId)
    }

    node.isEndOfWord = true
  }

  /**
   * 搜索前缀匹配的所有项
   */
  search(prefix: string): T[] {
    const normalized = prefix.toLowerCase()
    let node = this.root

    // 遍历前缀
    for (const char of normalized) {
      if (!node.children.has(char)) {
        return []
      }
      node = node.children.get(char)!
    }

    // 收集所有匹配的项
    const itemIds = new Set<string>()
    this.collectItems(node, itemIds)

    return Array.from(itemIds)
      .map(id => this.itemsById.get(id))
      .filter((item): item is T => item !== undefined)
  }

  /**
   * 递归收集节点下的所有项
   */
  private collectItems(node: TrieNode, result: Set<string>) {
    for (const itemId of node.items) {
      result.add(itemId)
    }

    for (const child of node.children.values()) {
      this.collectItems(child, result)
    }
  }

  /**
   * 清空索引
   */
  clear() {
    this.root = new TrieNode()
    this.itemsById.clear()
  }

  /**
   * 获取索引项数量
   */
  get size(): number {
    return this.itemsById.size
  }
}

/**
 * 倒排索引
 * 将关键词映射到包含该关键词的项
 */
export class InvertedIndex<T extends { id: string }> {
  private index = new Map<string, Set<string>>() // word -> item IDs
  private itemsById = new Map<string, T>()

  /**
   * 构建索引
   */
  build(items: T[], tokenizer: (item: T) => string[]) {
    this.clear()

    for (const item of items) {
      this.itemsById.set(item.id, item)
      const tokens = tokenizer(item)

      for (const token of tokens) {
        const normalized = token.toLowerCase()
        if (!this.index.has(normalized)) {
          this.index.set(normalized, new Set())
        }
        this.index.get(normalized)!.add(item.id)
      }
    }
  }

  /**
   * 搜索包含所有关键词的项（AND 查询）
   */
  searchAll(keywords: string[]): T[] {
    if (keywords.length === 0) {
      return Array.from(this.itemsById.values())
    }

    const normalized = keywords.map(k => k.toLowerCase())

    // 获取所有关键词对应的集合
    const postingLists: Set<string>[] = []
    for (const keyword of normalized) {
      const matchSet = this.index.get(keyword)
      if (!matchSet || matchSet.size === 0) {
        return [] // 任一关键词不存在，直接返回空
      }
      postingLists.push(matchSet)
    }

    // 按集合大小排序，从小到大，优先处理小集合以快速缩小交集
    postingLists.sort((a, b) => a.size - b.size)

    // 以最小集合为基础计算交集
    let intersection = new Set(postingLists[0]!)

    for (let i = 1; i < postingLists.length; i++) {
      const currentSet = postingLists[i]!

      // 就地删除不在当前集合中的元素
      for (const id of intersection) {
        if (!currentSet.has(id)) {
          intersection.delete(id)
        }
      }

      // 早期退出：交集为空
      if (intersection.size === 0) {
        return []
      }
    }

    return Array.from(intersection)
      .map(id => this.itemsById.get(id))
      .filter((item): item is T => item !== undefined)
  }

  /**
   * 搜索包含任一关键词的项（OR 查询）
   */
  searchAny(keywords: string[]): T[] {
    if (keywords.length === 0) {
      return Array.from(this.itemsById.values())
    }

    const itemIds = new Set<string>()

    for (const keyword of keywords) {
      const normalized = keyword.toLowerCase()
      const matchedIds = this.index.get(normalized)
      if (matchedIds) {
        for (const id of matchedIds) {
          itemIds.add(id)
        }
      }
    }

    return Array.from(itemIds)
      .map(id => this.itemsById.get(id))
      .filter((item): item is T => item !== undefined)
  }

  /**
   * 清空索引
   */
  clear() {
    this.index.clear()
    this.itemsById.clear()
  }

  /**
   * 获取索引词数量
   */
  get termCount(): number {
    return this.index.size
  }

  /**
   * 获取索引项数量
   */
  get itemCount(): number {
    return this.itemsById.size
  }
}
