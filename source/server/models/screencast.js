'use strict';

export default function(sequelize, DataTypes) {
  const Screencast = sequelize.define('Screencast', {
    screencastId: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
    },
    durationInSeconds: {
      type: DataTypes.INTEGER(11),
    },
    description: {
      type: DataTypes.STRING,
    },
    submissionDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    referralCount: {
      type: DataTypes.INTEGER(11),
      defaultValue: 0
    },
    channelId: {
      type: DataTypes.STRING,
    },
    approved: {
      type: DataTypes.BOOLEAN,
    },
    featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    tweetedAt: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'screencasts',
    classMethods: {
      associate: function(models) {
        Screencast.belongsTo(models.Channel, {
          foreignKey: 'channelId'
        });
        Screencast.belongsToMany(models.Tag, {
          through: models.ScreencastTag,
          foreignKey: 'screencastId'
        });
      }
    }
  });
  return Screencast;
}
