import { MouseEvent as ReactMouseEvent } from 'react';
import { IComment, IGiscussion, IReactionGroups, IReply } from './models/adapter';
import {
  GComment,
  GCommentAuthorAssociation,
  GReactionGroup,
  GReply,
  GRepositoryDiscussion,
  GUser,
} from './models/github';

export function adaptReactionGroups(reactionGroups: GReactionGroup[]): IReactionGroups {
  return reactionGroups.reduce((acc, group) => {
    acc[group.content] = {
      count: group.users.totalCount,
      viewerHasReacted: group.viewerHasReacted,
    };
    return acc;
  }, {}) as IReactionGroups;
}

export function adaptAuthorAssociation(association: GCommentAuthorAssociation) {
  return association === 'NONE' ? '' : association.toLowerCase().replace('_', ' ');
}

export function adaptBodyHTML(bodyHTML: string) {
  return bodyHTML.replace(
    '<a data-pjax="true" class="commit-tease-sha" href="',
    '<a data-pjax="true" class="commit-tease-sha" href="https://github.com',
  );
}

export function adaptReply(reply: GReply): IReply {
  const {
    reactionGroups,
    replyTo: { id: replyToId },
    authorAssociation: association,
    bodyHTML: body,
    ...rest
  } = reply;

  const authorAssociation = adaptAuthorAssociation(association);
  const reactions = adaptReactionGroups(reactionGroups);
  const bodyHTML = adaptBodyHTML(body);

  return { ...rest, bodyHTML, authorAssociation, reactions, replyToId };
}

export function adaptComment(comment: GComment): IComment {
  const {
    replies: repliesData,
    reactionGroups,
    authorAssociation: association,
    bodyHTML: body,
    ...rest
  } = comment;
  const { totalCount: replyCount, nodes: replyNodes } = repliesData;

  const authorAssociation = adaptAuthorAssociation(association);
  const reactions = adaptReactionGroups(reactionGroups);
  const bodyHTML = adaptBodyHTML(body);
  const replies = replyNodes.map(adaptReply);

  return { ...rest, bodyHTML, authorAssociation, replyCount, reactions, replies };
}

export function adaptDiscussion({
  viewer,
  discussion,
}: {
  viewer: GUser;
  discussion: GRepositoryDiscussion | null;
}): IGiscussion {
  if (!discussion) return { viewer, discussion: null };

  const {
    id,
    repository,
    comments: { pageInfo, totalCount: totalCommentCount, ...commentsData },
  } = discussion;

  const totalReplyCount = commentsData.nodes.reduce(
    (acc, comment) => acc + comment.replies.totalCount,
    0,
  );

  const comments = commentsData.nodes.map(adaptComment);

  return {
    viewer,
    discussion: {
      id,
      totalCommentCount,
      totalReplyCount,
      pageInfo,
      repository,
      comments,
    },
  };
}

export function toggleEmail(event: ReactMouseEvent<HTMLDivElement, MouseEvent>) {
  const element = event.target as Element;
  const toggle = element.closest<HTMLAnchorElement>('.email-hidden-toggle a');
  if (toggle && event.currentTarget.contains(toggle)) {
    event.preventDefault();
    const container = element.closest('div');
    const content = container.querySelector('.email-hidden-reply');
    content.classList.toggle('expanded');
  }
}

export function clipboardCopy(event: ReactMouseEvent<HTMLDivElement, MouseEvent>) {
  const element = event.target as Element;
  const button = element.closest<Element>('clipboard-copy');

  if (button && event.currentTarget.contains(button)) {
    event.preventDefault();

    const placeholder = document.createElement('textarea');
    document.body.appendChild(placeholder);

    placeholder.value = button.getAttribute('value');
    placeholder.select();
    document.execCommand('copy');

    document.body.removeChild(placeholder);

    const clipboardIcon = button.querySelector<SVGElement>('svg.js-clipboard-clippy-icon');
    const checkIcon = button.querySelector<SVGElement>('svg.js-clipboard-check-icon');

    clipboardIcon.classList.add('d-none');
    checkIcon.classList.remove('d-none');

    setTimeout(() => {
      clipboardIcon.classList.remove('d-none');
      checkIcon.classList.add('d-none');
    }, 3000);
  }
}

export function handleCommentClick(event: ReactMouseEvent<HTMLDivElement, MouseEvent>) {
  toggleEmail(event);
  clipboardCopy(event);
}
