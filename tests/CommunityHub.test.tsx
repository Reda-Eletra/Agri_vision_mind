import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { PostCard } from '../components/CommunityHub';

test('community like button uses likedByMe instead of user email', () => {
  render(
    <PostCard
      post={{
        id: 'post-1',
        authorId: 'author-1',
        authorName: 'Author',
        authorAvatar: '/avatar.png',
        title: 'Field note',
        content: 'Content',
        category: 'tips',
        likes: 2,
        likedByMe: true,
        comments: [],
        timestamp: 'now',
      }}
      user={{
        id: 'user-1',
        name: 'Reader',
        email: 'changed@example.com',
        profilePicture: '/reader.png',
      }}
      onLike={vi.fn()}
      onComment={vi.fn()}
      t={(key) => key}
    />
  );

  expect(screen.getByRole('button', { name: /2 community\.post\.like/i }))
    .toHaveClass('text-red-500');
});
