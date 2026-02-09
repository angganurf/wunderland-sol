use anchor_lang::prelude::*;

use crate::errors::WunderlandError;
use crate::state::{AgentVault, JobEscrow, JobPosting, JobStatus, JobSubmission};

/// Approve an assigned job submission and release escrowed funds into the agent vault.
#[derive(Accounts)]
pub struct ApproveJobSubmission<'info> {
    #[account(
        mut,
        constraint = job.creator == creator.key() @ WunderlandError::UnauthorizedJobCreator,
        constraint = job.status == JobStatus::Submitted @ WunderlandError::JobNotSubmitted,
    )]
    pub job: Account<'info, JobPosting>,

    #[account(
        mut,
        seeds = [b"job_escrow", job.key().as_ref()],
        bump = escrow.bump,
        constraint = escrow.job == job.key() @ WunderlandError::InvalidJobEscrow,
    )]
    pub escrow: Account<'info, JobEscrow>,

    #[account(
        seeds = [b"job_submission", job.key().as_ref()],
        bump = submission.bump,
        constraint = submission.job == job.key(),
    )]
    pub submission: Account<'info, JobSubmission>,

    /// Recipient agent vault (payout destination).
    #[account(
        mut,
        seeds = [b"vault", submission.agent.as_ref()],
        bump = vault.bump,
        constraint = vault.agent == submission.agent @ WunderlandError::InvalidAgentVault,
    )]
    pub vault: Account<'info, AgentVault>,

    /// Creator wallet (approver).
    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ApproveJobSubmission>) -> Result<()> {
    let job = &mut ctx.accounts.job;
    let escrow = &mut ctx.accounts.escrow;
    let amount = escrow.amount;

    require!(amount > 0, WunderlandError::InvalidAmount);
    require!(
        ctx.accounts.submission.agent == job.assigned_agent,
        WunderlandError::UnauthorizedJobAgent
    );

    // Keep escrow rent-exempt after payout.
    let rent = Rent::get()?;
    let min_balance = rent.minimum_balance(JobEscrow::LEN);
    let escrow_info = escrow.to_account_info();
    let escrow_lamports = escrow_info.lamports();
    require!(
        escrow_lamports >= min_balance.saturating_add(amount),
        WunderlandError::InsufficientJobEscrowBalance
    );

    // Transfer: escrow -> agent vault (both program-owned, safe to mutate lamports directly).
    **escrow_info.try_borrow_mut_lamports()? = escrow_lamports
        .checked_sub(amount)
        .ok_or(WunderlandError::ArithmeticOverflow)?;

    let vault_info = ctx.accounts.vault.to_account_info();
    **vault_info.try_borrow_mut_lamports()? = vault_info
        .lamports()
        .checked_add(amount)
        .ok_or(WunderlandError::ArithmeticOverflow)?;

    escrow.amount = 0;
    job.status = JobStatus::Completed;
    job.updated_at = Clock::get()?.unix_timestamp;

    msg!(
        "Job completed: job={} paid={} lamports to vault={}",
        job.key(),
        amount,
        ctx.accounts.vault.key()
    );
    Ok(())
}

