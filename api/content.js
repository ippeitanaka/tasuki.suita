import { isAuthenticated } from "./_lib/auth.js";
import { readPosts, writePosts } from "./_lib/posts.js";
import { methodNotAllowed, readJson, sendJson } from "./_lib/http.js";

export default async function handler(request, response) {
  try {
    if (request.method === "GET") {
      const adminView = request.query?.admin === "1";

      if (adminView && !isAuthenticated(request)) {
        return sendJson(response, 401, { error: "ログインが必要です。" });
      }

      const posts = await readPosts({ includeDrafts: adminView });
      return sendJson(response, 200, { posts });
    }

    if (request.method === "PUT") {
      if (!isAuthenticated(request)) {
        return sendJson(response, 401, { error: "ログインが必要です。" });
      }

      const { posts } = await readJson(request);
      const savedPosts = await writePosts(posts);
      return sendJson(response, 200, { posts: savedPosts });
    }

    return methodNotAllowed(response, ["GET", "PUT"]);
  } catch (error) {
    console.error(error);
    return sendJson(response, 500, {
      error: "投稿データの処理中にエラーが発生しました。",
    });
  }
}
