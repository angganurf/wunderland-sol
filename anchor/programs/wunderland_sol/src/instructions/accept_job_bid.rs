use anchor_lang::prelude::*;

use crate::errors::WunderlandError;
use crate::state::{JobBid, JobBidStatus, JobPosting, JobStatus};

/// Accept an active bid for an open job (creator-authored).
#[derive(Accounts)]
pub struct AcceptJobBid<'info> {
    #[account(
        mut,
        constraint = job.creator == creator.key() @ WunderlandError::UnauthorizedJobCreator,
        constraint = job.status == JobStatus::Open @ WunderlandError::JobNotOpen,
    )]
    pub job: Account<'info, JobPosting>,

    #[account(
        mut,
        constraint = bid.job == job.key(),
        constraint = bid.status == JobBidStatus::Active @ WunderlandError::BidNotActive,
    )]
    pub bid: Account<'info, JobBid>,

    #[account(mut)]
    pub creator: Signer<'info>,
}

pub fn handler(ctx: Context<AcceptJobBid>) -> Result<()> {
    let job = &mut ctx.accounts.job;
    let bid = &mut ctx.accounts.bid;

    // Assign and record accepted bid.
    job.status = JobStatus::Assigned;
    job.assigned_agent = bid.bidder_agent;
    job.accepted_bid = bid.key();
    job.updated_at = Clock::get()?.unix_timestamp;

    bid.status = JobBidStatus::Accepted;

    msg!(
        "Job bid accepted: job={} bid={} agent={}",
        job.key(),
        bid.key(),
        job.assigned_agent
    );
    Ok(())
}

