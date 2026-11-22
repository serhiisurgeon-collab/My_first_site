import { linkPolicy } from '../../js/link-policy.js';

export function normaliseLinks($, base) {
  $('a[href]').each((_, element) => {
    const link = $(element);
    const policy = linkPolicy(link.attr('href'), base, link.attr('download') !== undefined);
    const rel = new Set((link.attr('rel') || '').split(/\s+/).filter(Boolean));
    if (policy.external) {
      link.attr('target', '_blank');
      rel.add('noopener'); rel.add('noreferrer');
    } else {
      link.removeAttr('target');
      rel.delete('noopener'); rel.delete('noreferrer');
    }
    if (rel.size) link.attr('rel', [...rel].join(' '));
    else link.removeAttr('rel');
    if (policy.download && link.attr('download') === undefined) link.attr('download', '');
  });
}
