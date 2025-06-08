"use strict";
const {
	env: { WEIBO_ID },
} = require("process");
const { writeFileSync } = require("fs");
const jsdom = require("jsdom");
const RSS = require("rss");
const feed = new RSS({
	title: "最新微博",
	site_url: "https://weibo.com/",
	image_url: "https://weibo.com/favicon.ico",
	language: "zh-CN",
	ttl: 5,
});
(async () => {
	const getFollowings = async (followings = [], page = 1) => {
		const result = await fetch(
			`https://m.weibo.cn/api/container/getIndex?containerid=231051_-_followers_-_${WEIBO_ID}&page=${page}`
		).then(r => r.json());
		const following = result?.data?.cards
			?.filter(c => c.itemid)[0]
			?.card_group?.map(c => {
				return {
					id: c.user.id,
					username: c.user.screen_name,
				};
			});
		if (!result?.ok && result?.msg !== "这里还没有内容")
			throw new Error(result?.msg ?? result);
		if (!following || !following.length) return followings;
		followings.push(...following);
		if (followings.length < result.data.cardlistInfo.total)
			return getFollowings(followings, page + 1);
		return followings;
	};
	const d = +new Date() - 1000 * 60 * 60 * 24 * 7;
	const getPage = async (id, allPosts = [], page = 1) => {
		const r = await fetch(
			`https://m.weibo.cn/api/container/getIndex?containerid=230413${id}_-_WEIBO_SECOND_PROFILE_WEIBO&page=${page}`
		).then(res => res.json());
		const posts = r?.data?.cards
			?.filter(c => c.mblog)
			.map(c => c.mblog)
			.filter(c => !c.isTop)
			.map(c => {
				const d = new jsdom.JSDOM(c.raw_text ?? c.text).window.document;
				d.body
					.querySelectorAll("img")
					.forEach(i => i.replaceWith(d.createTextNode(i.alt)));
				return {
					description: d.body.textContent,
					url: `https://weibo.com/${id}/${c.bid}`,
					guid: c.id,
					date: c.created_at,
					image_url: c.original_pic,
				};
			});
		if (!r?.ok && r?.msg !== "这里还没有内容") throw new Error(r?.msg ?? r);
		if (!posts || !posts.length) return allPosts;
		allPosts.push(...posts);
		if (+new Date(posts[posts.length - 1].date) > d)
			return getPage(id, allPosts, page + 1);
		return allPosts;
	};
	await Promise.all(
		(
			await getFollowings()
		).map(async ({ id, username: author }) =>
			(
				await getPage(id)
			)
				.filter(c => c.description)
				.filter(c => +new Date(c.date) > d)
				.forEach(({ description, guid, url, date, image_url }) =>
					feed.item({
						title: description.split("<br />")[0],
						description,
						url,
						guid,
						author,
						date,
						image_url,
						enclosure: {
							url: image_url,
						},
					})
				)
		)
	);
	writeFileSync("feeds/weibo.xml", feed.xml());
})();
