use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    bpf_loader_upgradeable::{self, UpgradeableLoaderState},
    program_utils::limited_deserialize,
};

use crate::errors::WunderlandError;
use crate::state::{GlobalTreasury, ProgramConfig};

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = authority,
        space = ProgramConfig::LEN,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, ProgramConfig>,

    #[account(
        init,
        payer = authority,
        space = GlobalTreasury::LEN,
        seeds = [b"treasury"],
        bump
    )]
    pub treasury: Account<'info, GlobalTreasury>,

    /// CHECK: Upgradeable loader ProgramData account for this program.
    pub program_data: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeConfig>) -> Result<()> {
    // Prevent config sniping: only the program upgrade authority can initialize config.
    let program_id = *ctx.program_id;
    let (expected_program_data, _bump) = Pubkey::find_program_address(
        &[program_id.as_ref()],
        &bpf_loader_upgradeable::id(),
    );

    require_keys_eq!(
        ctx.accounts.program_data.key(),
        expected_program_data,
        WunderlandError::InvalidProgramData
    );

    let program_data_info = ctx.accounts.program_data.to_account_info();
    require_keys_eq!(
        *program_data_info.owner,
        bpf_loader_upgradeable::id(),
        WunderlandError::InvalidProgramData
    );

    let data = program_data_info.try_borrow_data()?;
    let state: UpgradeableLoaderState =
        limited_deserialize(&data, 64).map_err(|_| error!(WunderlandError::InvalidProgramData))?;

    match state {
        UpgradeableLoaderState::ProgramData {
            upgrade_authority_address,
            ..
        } => {
            let upgrade_authority = upgrade_authority_address
                .ok_or(error!(WunderlandError::ProgramImmutable))?;
            require_keys_eq!(
                upgrade_authority,
                ctx.accounts.authority.key(),
                WunderlandError::UnauthorizedAuthority
            );
        }
        _ => return err!(WunderlandError::InvalidProgramData),
    }

    let cfg = &mut ctx.accounts.config;
    cfg.authority = ctx.accounts.authority.key();
    cfg.agent_count = 0;
    cfg.enclave_count = 0;
    cfg.bump = ctx.bumps.config;

    let treasury = &mut ctx.accounts.treasury;
    treasury.authority = ctx.accounts.authority.key();
    treasury.total_collected = 0;
    treasury.bump = ctx.bumps.treasury;

    msg!(
        "Program config initialized. Authority: {}",
        cfg.authority
    );
    Ok(())
}
