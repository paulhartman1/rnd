import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/feature-flags";

interface PostRequest {
  accountIds: string[]; // Social account IDs to post to
  message: string;
  imageUrl?: string; // Optional image URL
}

/**
 * POST - Create a social media post to Facebook and/or Instagram
 */
export async function POST(request: Request) {
  try {
    const body: PostRequest = await request.json();
    const { accountIds, message, imageUrl } = body;

    // Validate input
    if (!accountIds || accountIds.length === 0) {
      return NextResponse.json(
        { error: "At least one account must be selected" },
        { status: 400 }
      );
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // Fetch the accounts to post to
    const { data: accounts, error: accountsError } = await supabase
      .from("social_accounts")
      .select("*")
      .in("id", accountIds)
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (accountsError || !accounts || accounts.length === 0) {
      console.error("Failed to fetch accounts:", accountsError);
      return NextResponse.json(
        { error: "No valid accounts found" },
        { status: 404 }
      );
    }

    // Check if Facebook feature is enabled
    const isFacebookEnabled = await isFeatureEnabled("facebook_integration", user.email ?? undefined);

    // Filter out Facebook accounts if feature is disabled
    const validAccounts = isFacebookEnabled
      ? accounts
      : accounts.filter(acc => acc.platform !== "facebook");

    if (validAccounts.length === 0) {
      return NextResponse.json(
        { error: "No valid accounts available for posting" },
        { status: 403 }
      );
    }

    const results = [];
    const postsToStore = [];

    // Post to each selected account
    for (const account of validAccounts) {
      try {
        let postResult;

        if (account.platform === "facebook") {
          postResult = await postToFacebook(account, message, imageUrl);
        } else if (account.platform === "instagram") {
          postResult = await postToInstagram(account, message, imageUrl);
        } else {
          continue; // Skip unsupported platforms
        }

        results.push({
          accountId: account.id,
          accountName: account.account_name,
          platform: account.platform,
          success: postResult.success,
          platformPostId: postResult.postId,
          postUrl: postResult.postUrl,
          error: postResult.error,
        });

        // Store post record
        postsToStore.push({
          user_id: user.id,
          social_account_id: account.id,
          message,
          media_urls: imageUrl ? [imageUrl] : [],
          platform: account.platform,
          platform_post_id: postResult.postId || null,
          post_url: postResult.postUrl || null,
          status: postResult.success ? "published" : "failed",
          published_at: postResult.success ? new Date().toISOString() : null,
          error_message: postResult.error || null,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        results.push({
          accountId: account.id,
          accountName: account.account_name,
          platform: account.platform,
          success: false,
          error: errorMessage,
        });

        postsToStore.push({
          user_id: user.id,
          social_account_id: account.id,
          message,
          media_urls: imageUrl ? [imageUrl] : [],
          platform: account.platform,
          status: "failed",
          error_message: errorMessage,
        });
      }
    }

    // Store all post records
    if (postsToStore.length > 0) {
      const { error: insertError } = await supabase
        .from("social_posts")
        .insert(postsToStore);

      if (insertError) {
        console.error("Failed to store post records:", insertError);
        // Don't fail the request, just log the error
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: successCount > 0,
      successCount,
      failureCount,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Social post creation failed:", message);

    return NextResponse.json(
      {
        error: "Failed to create social media post",
        message: process.env.NODE_ENV === "production" ? undefined : message,
      },
      { status: 500 }
    );
  }
}

/**
 * Post to a Facebook page
 * Reference: https://developers.facebook.com/docs/pages-api/posts
 */
async function postToFacebook(
  account: any,
  message: string,
  imageUrl?: string
): Promise<{ success: boolean; postId?: string; postUrl?: string; error?: string }> {
  const pageId = account.platform_account_id;
  const accessToken = account.access_token;

  let endpoint = `https://graph.facebook.com/v21.0/${pageId}/`;

  if (imageUrl) {
    // Post photo with message
    endpoint += "photos";
    const body = new URLSearchParams({
      url: imageUrl,
      caption: message,
      access_token: accessToken,
    });

    const response = await fetch(endpoint, {
      method: "POST",
      body,
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || "Failed to post to Facebook",
      };
    }

    return {
      success: true,
      postId: data.id,
      postUrl: data.id ? `https://facebook.com/${data.id}` : undefined,
    };
  } else {
    // Post text-only message
    endpoint += "feed";
    const body = new URLSearchParams({
      message,
      access_token: accessToken,
    });

    const response = await fetch(endpoint, {
      method: "POST",
      body,
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || "Failed to post to Facebook",
      };
    }

    return {
      success: true,
      postId: data.id,
      postUrl: data.id ? `https://facebook.com/${data.id}` : undefined,
    };
  }
}

/**
 * Post to Instagram Business Account
 * Reference: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
 */
async function postToInstagram(
  account: any,
  message: string,
  imageUrl?: string
): Promise<{ success: boolean; postId?: string; postUrl?: string; error?: string }> {
  const igAccountId = account.platform_account_id;
  const accessToken = account.access_token;

  if (!imageUrl) {
    return {
      success: false,
      error: "Instagram posts require an image",
    };
  }

  // Step 1: Create media container
  const containerEndpoint = `https://graph.facebook.com/v21.0/${igAccountId}/media`;
  const containerBody = new URLSearchParams({
    image_url: imageUrl,
    caption: message,
    access_token: accessToken,
  });

  const containerResponse = await fetch(containerEndpoint, {
    method: "POST",
    body: containerBody,
  });

  const containerData = await containerResponse.json();

  if (!containerResponse.ok || containerData.error) {
    return {
      success: false,
      error: containerData.error?.message || "Failed to create Instagram media container",
    };
  }

  const creationId = containerData.id;

  // Step 2: Publish the media container
  const publishEndpoint = `https://graph.facebook.com/v21.0/${igAccountId}/media_publish`;
  const publishBody = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken,
  });

  const publishResponse = await fetch(publishEndpoint, {
    method: "POST",
    body: publishBody,
  });

  const publishData = await publishResponse.json();

  if (!publishResponse.ok || publishData.error) {
    return {
      success: false,
      error: publishData.error?.message || "Failed to publish Instagram post",
    };
  }

  return {
    success: true,
    postId: publishData.id,
    postUrl: account.account_username
      ? `https://instagram.com/p/${publishData.id}`
      : undefined,
  };
}
