"use strict";
const {
	env: { COPYMANGA_TOKEN },
} = require("process");
const { writeFileSync } = require("fs");
const RSS = require("rss");
const feed = new RSS({
	title: "我收藏的漫畫",
	site_url: "https://www.mangacopy.com",
	image_url: "https://www.mangacopy.com/favicon.ico",
	language: "zh-CN",
	ttl: 5,
});
(async () => {
	const getComics = async (comics = [], offset = 0) => {
		const result = await fetch(
			`https://www.mangacopy.com/api/v3/member/collect/comics?${new URLSearchParams(
				{
					ordering: "-datetime_updated",
					offset,
				}
			)}`,
			{
				headers: {
					Authorization: `Token ${COPYMANGA_TOKEN}`,
				},
			}
		).then(r => r.json());
		if (result?.code !== 200) throw new Error(result?.message ?? result);
		const { list, total, offset: _offset } = result.results;
		comics.push(...list);
		if (comics.length < total) return getComics(comics, _offset);
		return comics;
	};
	(await getComics()).map(
		({
			comic: {
				name,
				last_chapter_name,
				uuid,
				author,
				datetime_updated,
				path_word,
				cover,
			},
		}) =>
			feed.item({
				title: name,
				description: last_chapter_name,
				url: `https://www.mangacopy.com/comic/${path_word}`,
				guid: uuid,
				author: author.map(a => a.name).join("、"),
				image_url: cover.replace(
					/^https:\/\/hi77-overseas\.mangafunb\.fun\/d\/daozeijiang\/cover\/(\d+)\.(\w+)\..*$/,
					"https://hi77-overseas.mangafunb.fun/d/daozeijiang/cover/$1.$2"
				),
				date: +new Date(datetime_updated) + 8 * 60 * 60 * 1000,
			})
	);
	writeFileSync("feeds/copymanga.xml", feed.xml());
})();
