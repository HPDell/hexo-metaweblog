import * as md5 from "md5";
import * as fs from "fs-extra";
import * as simplegit from "simple-git/promise";
import * as path from "path";
import * as moment from "moment";
import * as Hexo from "hexo";
import { Stream } from "stream";
const config = require("./package.json");
const blog = config.meta.blog

class ExpressError extends Error {
    status: number;

    constructor(msg, code) {
        super(msg);
        this.status = code;
    }
}

const hexo = new Hexo(blog, {
    silent: true,
    safe: true
});

interface PostContent {
    categories: string[];
    dateCreated: Date;
    description: string;
    title: string;
    mt_keywords: string;
    wp_slug: string;
}

interface MediaObject {
    overwrite: boolean;
    bits: Buffer;
    name: string;
    type: string;
}

export async function newPost(blogid: string, username: string, password: string, post: PostContent, publish: boolean, callback: Function) {
    if (blogid) {
        if (username.toLowerCase() === "hpdell" && md5(password) === "2b759a6996d878c41bb7d56ce530d031") {
            const git = simplegit(blog);
            if (await git.checkIsRepo()) {
                try {
                    let postInfo = (await fs.readFile(path.resolve(path.join(blog, "scaffolds", "post.md")))).toString();
                    postInfo = postInfo.replace("{{ title }}", post.title);
                    postInfo = postInfo.replace("{{ date }}", moment(post.dateCreated).format("YYYY-MM-DD HH:mm:ss"));
                    if (post.categories && post.categories.length) {
                        postInfo = postInfo.replace("categories:", `categories: ${post.categories[0]}`);
                    }
                    if (post.mt_keywords) {
                        let tags = post.mt_keywords.split(",");
                        let tagInfo = tags.map(item => `    - ${item}`).join("\n");
                        postInfo = postInfo.replace("tags:", `tags:\n${tagInfo}`);
                    }
                    let content = postInfo + post.description;
                    let postPath = path.resolve(path.join(blog, "source", "_posts", `${post.wp_slug}.md`));
                    try {
                        await fs.writeFile(postPath, content);
                        try {
                            await publishToGitHub(git, path.join("source", "_posts", `${post.wp_slug}.md`));
                            callback(null, post.wp_slug);
                        } catch (error) {
                            callback(new ExpressError((error as Error).message, 500));
                        }
                    } catch (error) {
                        callback(new ExpressError("Internal Server Error: Cannot write post file.", 500));
                    }
                } catch (error) {
                    callback(new ExpressError("Internal Server Error: Cannot read scaffolds.", 500));
                }
            } else {
                callback(new ExpressError("Inernal Server Error: Not a hexo repo.", 500));
            }
        } else {
            callback(new ExpressError("Username or Password is wrong.", 500));
        }
    } else {
        callback(new ExpressError("Blog id is required.", 500));
    }
}

export function editPost(postid: string, username: string, password: string, post: PostContent, publish: boolean, callback: Function) {
    callback(new ExpressError("Edit is not supported!", 500));
}


export async function getPost(postid: string, username: string, password: string, callback: Function) {
    try {
        await hexo.load()
        let posts = hexo.locals.get("posts").filter((v, i) => v.title === postid).toArray();
        if (posts && posts.length) {
            let post = posts[0];
            let postStructure: PostContent = {
                categories: post.categories,
                dateCreated: post.date.toDate(),
                description: post.content,
                title: post.title,
                mt_keywords: post.tags.join(","),
                wp_slug: path.basename(post.path)
            };
            callback(null, postStructure)
        }
    } catch (error) {
        callback(new ExpressError("Post not found", 500));
    }
}

export function getCategories(blogid: string, username: string, password: string, callback: Function) {
    callback(null, config.meta.categories.map((item: string) => {
        return {
            categoryid: item,
            description: item,
            title: item
        }
    }));
}

export async function newMediaObject(blogid: string, username: string, password: string, mediaObject: MediaObject, callback: Function) {
    if (blogid) {
        if (username.toLowerCase() === "hpdell" && md5(password) === "2b759a6996d878c41bb7d56ce530d031") {
            let imgPath = path.join(blog, "source", "assets", "img", mediaObject.name);
            try {
                await fs.writeFile(imgPath, mediaObject.bits);
                callback(null, {
                    url: "/" + ["assets", "img", mediaObject.name].join("/")
                })
            } catch (error) {
                callback(new ExpressError("Writefile Wrong.", 500));
            }
        } else {
            callback(new ExpressError("Username or Password is wrong.", 500));
        }
    } else {
        callback(new ExpressError("Blog id is required.", 500));
    }
}

async function publishToGitHub(git: simplegit.SimpleGit, postPath) {
    try {
        let imgDirPath = path.join("source", "assets", "img", "*");
        await git.add([postPath, imgDirPath]);
        await git.commit(`Add Post: ${path.basename(postPath)}`);
        await git.pull("origin", "master", {
            "--rebase": "true"
        });
        await git.push();
    } catch (error) {
        throw new Error("git error");
    }
}