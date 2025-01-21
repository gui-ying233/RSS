"use strict";
const {
	env: { BILIBILI_SESSDATA },
} = require("process");
const { writeFileSync } = require("fs");
const RSS = require("rss");
const feed = new RSS({
	title: "bilibili 最新动态",
	site_url: "https://t.bilibili.com/",
	image_url: "https://www.bilibili.com/favicon.ico",
	language: "zh-CN",
	ttl: 5,
});
(async () => {
	const d = +new Date() - 1000 * 60 * 60 * 24 * 7;
	const getDynamics = async (dynamics = [], offset = "") => {
		const result = await fetch(
			`https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/all?${new URLSearchParams(
				{ offset }
			)}`,
			{ headers: { cookie: `SESSDATA=${BILIBILI_SESSDATA}` } }
		).then(res => res.json());
		if (result?.code !== 0) throw new Error(result?.message ?? result);
		const has_more = result?.data?.has_more;
		const _offset = result?.data?.offset;
		const items = result?.data?.items?.map(
			({
				id_str,
				modules: {
					module_author: { name, pub_action, pub_ts },
					module_dynamic: { desc, additional, major },
				},
			}) => {
				return {
					id_str,
					name,
					pub_action,
					pub_ts,
					text: desc?.text ?? "",
					image_url:
						additional?.common?.cover ??
						additional?.goods?.cover ??
						additional?.ugc?.cover ??
						additional?.ugc?.cover ??
						major?.ugc_season?.cover ??
						major?.article?.covers?.[0] ??
						major?.archive?.cover ??
						major?.common?.cover ??
						major?.pgc?.cover ??
						major?.courses?.cover ??
						major?.music?.cover ??
						major?.live?.cover,
				};
			}
		);
		if (
			!has_more ||
			dynamics.length >= 700 ||
			+new Date(items[items.length - 1].pub_ts * 1000) < d
		)
			return dynamics;
		dynamics.push(...items);
		return getDynamics(dynamics, _offset);
	};
	await Promise.all(
		(
			await getDynamics()
		)
			.filter(({ pub_ts }) => +new Date(pub_ts * 1000) > d)
			.map(({ id_str, name, pub_action, pub_ts, text }) => {
				return {
					description: text || pub_action || false,
					url: `https://t.bilibili.com/${id_str}`,
					guid: id_str,
					author: name,
					date: new Date(pub_ts * 1000),
				};
			})
			.filter(
				({ description }) =>
					description &&
					!/补贴价超划算|7天无理由|售后保障|运费险|省流|大促|京东|淘宝|百亿补贴|助眠|电动牙刷|天猫|新品|保价|温眠|望舒心|妙界|PDD|拼多多|双11|天猫|萌芽家|号真爱粉，靓号在手，走路带风，解锁专属粉丝卡片，使用专属粉丝装扮，你也来生成你的专属秀起来吧！|【直播回放】|中奖/.test(
						description
					)
			)
			.map(({ description, url, guid, author, date }) =>
				feed.item({
					title: description.split("\n")[0],
					description,
					url,
					guid,
					author,
					date,
				})
			)
	);
	writeFileSync("feeds/bilibili.xml", feed.xml());
})();
