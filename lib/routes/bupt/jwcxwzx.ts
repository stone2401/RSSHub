import { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { load } from 'cheerio';
import timezone from '@/utils/timezone';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/jwcxwzx',
    categories: ['university'],
    example: '/bupt/jwcxwzx',
    parameters: {},
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['jwc.bupt.edu.cn/'],
        },
    ],
    name: '教务处通知公告',
    maintainers: ['Yoruet'],
    handler,
    url: 'https://jwc.bupt.edu.cn/',
};

async function handler() {
    const rootUrl = 'https://jwc.bupt.edu.cn';
    const currentUrl = `${rootUrl}/xwzx2.htm`; // 更改为教务处通知公告页面

    const response = await got({
        method: 'get',
        url: currentUrl,
    });

    const $ = load(response.data);

    const list = $('.txt-elise')
        .map((_, item) => {
            item = $(item);
            return {
                title: item.children().first().text(),
                link: `${rootUrl}/${item.children().first().attr('href')}`,
            };
        })
        .get();

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const detailResponse = await got({
                    method: 'get',
                    url: item.link,
                });

                const content = load(detailResponse.data);

                // 选择包含新闻内容的元素
                const newsContent = content('.v_news_content');

                // 移除不必要的标签，比如 <p> 和 <span> 中无用的内容
                newsContent.find('p, span, strong').each(function () {
                    const element = content(this);
                    const text = element.text().trim();

                    // 删除没有有用文本的元素，防止空元素被保留
                    if (text === '') {
                        element.remove();
                    } else {
                        // 去除多余的嵌套标签，但保留其内容
                        element.replaceWith(text);
                    }
                });

                // 清理后的内容转换为文本
                const cleanedDescription = newsContent.text().trim();

                // 提取并格式化发布时间
                item.description = cleanedDescription;
                item.pubDate = timezone(parseDate(content('.info').text().replace('发布时间：', '').trim()), +8);

                return item;
            })
        )
    );

    return {
        title: $('title').text(),
        link: currentUrl,
        item: items,
    };
}
