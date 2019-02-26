export function getUserBlogs(key: string, username: string, password: string, callback: Function) {
    console.log('getuserblogs called with key:', key, 'username:', username, 'and password:', password);
    callback(null, [{ blogid: 'hpdell-hexo', blogName: 'HPDell 的 Hexo 博客', }]);
}