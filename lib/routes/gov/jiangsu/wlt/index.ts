import { Route } from '@/types';
import { getCurrentPath } from '@/utils/helpers';
const __dirname = getCurrentPath(import.meta.url);

import cache from '@/utils/cache';
import got from '@/utils/got';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import { art } from '@/utils/render';
import * as path from 'node:path';

export const route: Route = {
    path: '/jiangsu/wlt/:page?',
    categories: ['government'],
    example: '/gov/jiangsu/wlt',
    parameters: { page: '页数，默认第 1 页' },
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
            source: ['wlt.jiangsu.gov.cn/'],
            target: '/jiangsu/wlt',
        },
    ],
    name: '江苏文旅局审批公告',
    maintainers: ['gideonsenku'],
    handler,
    url: 'wlt.jiangsu.gov.cn/',
};

async function handler(ctx) {
    const baseUrl = 'http://58.213.82.179:18080/jsswlt_sgs/front';
    const currentUrl = `${baseUrl}/list.do`;
    const page = ctx.req.param('page') ?? 1;
    const searchParams = {
        type: 0,
        pageNo0: page,
    };
    const response = await got({
        method: 'get',
        url: currentUrl,
        searchParams,
    });

    const $ = load(response.data);
    const list = $('.tg_tb1')
        .map((_, item) => {
            const i = $(item);
            return {
                title: i.text(),
                id: i.prop('onclick').match(/openDetail\('(\d+)'\)/)?.[1] || '',
                description: '',
                pubDate: new Date(),
            };
        })
        .get();
    const items = await Promise.all(
        list
            .filter((e) => e.id)
            .map((item) =>
                cache.tryGet(item.id, async () => {
                    const detailResponse = await got({
                        method: 'get',
                        url: baseUrl + '/detail.do?iid=' + item.id,
                    });
                    const $ = load(detailResponse.data);
                    const dateText = $('td:contains("许可决定日期")').next().text().trim();
                    const hostingUnit = $('td:contains("行政相对人名称")').next().text().trim();
                    const licenseNumber = $('td:contains("行政许可决定文书号")').next().text().trim();
                    const performanceName = $('td:contains("项目名称")').next().text().trim();
                    const performanceContent = $('td:contains("许可内容")').next().text().trim();

                    item.description = art(path.join(__dirname, './templates/wlt.art'), {
                        dateText,
                        hostingUnit,
                        licenseNumber,
                        performanceName,
                        performanceContent,
                    });
                    item.pubDate = parseDate(dateText);

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
