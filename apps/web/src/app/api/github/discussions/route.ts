import { NextResponse } from 'next/server';

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';
const REPO_OWNER = 'accnops';
const REPO_NAME = 'clawntown';

interface GitHubDiscussion {
  id: string;
  number: number;
  title: string;
  url: string;
  body: string;
  bodyHTML: string;
  createdAt: string;
  updatedAt: string;
  author: {
    login: string;
    avatarUrl: string;
  } | null;
  category: {
    name: string;
    emoji: string;
  };
  comments: {
    totalCount: number;
    nodes: Array<{
      id: string;
      body: string;
      bodyHTML: string;
      createdAt: string;
      author: {
        login: string;
        avatarUrl: string;
      } | null;
    }>;
  };
  answerChosenAt: string | null;
}

const DISCUSSIONS_QUERY = `
  query GetDiscussions($owner: String!, $name: String!, $first: Int!) {
    repository(owner: $owner, name: $name) {
      discussions(first: $first, orderBy: {field: UPDATED_AT, direction: DESC}) {
        nodes {
          id
          number
          title
          url
          body
          bodyHTML
          createdAt
          updatedAt
          author {
            login
            avatarUrl
          }
          category {
            name
            emoji
          }
          comments(first: 10) {
            totalCount
            nodes {
              id
              body
              bodyHTML
              createdAt
              author {
                login
                avatarUrl
              }
            }
          }
          answerChosenAt
        }
      }
      url
    }
  }
`;

export async function GET() {
  try {
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      // Return mock data if no token configured
      return NextResponse.json({
        discussions: [],
        repoUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}`,
        discussionsUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/discussions`,
        error: 'GitHub token not configured - showing link to discussions only',
      });
    }

    const response = await fetch(GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: DISCUSSIONS_QUERY,
        variables: {
          owner: REPO_OWNER,
          name: REPO_NAME,
          first: 10,
        },
      }),
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      throw new Error(data.errors[0]?.message || 'GraphQL error');
    }

    const repository = data.data?.repository;
    const discussions: GitHubDiscussion[] = repository?.discussions?.nodes || [];

    return NextResponse.json({
      discussions,
      repoUrl: repository?.url || `https://github.com/${REPO_OWNER}/${REPO_NAME}`,
      discussionsUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/discussions`,
    });
  } catch (error) {
    console.error('Error fetching GitHub discussions:', error);
    return NextResponse.json({
      discussions: [],
      repoUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}`,
      discussionsUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/discussions`,
      error: error instanceof Error ? error.message : 'Failed to fetch discussions',
    });
  }
}
